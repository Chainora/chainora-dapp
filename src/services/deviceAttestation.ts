import {
  getAddress,
  isAddress,
  type Address,
  type PublicClient,
} from 'viem';

import { CHAINORA_PROTOCOL_ADDRESSES, ZERO_ADDRESS } from '../contract/chainoraAddresses';
import { REGISTRY_ABI } from '../contract/chainoraAbis';
import { buildQrPayload } from './qrFlow';

export const DEVICE_ATTEST_QR_FEATURE = 'chainora-native-wallet:device-attest';

const DEVICE_ADAPTER_READ_ABI = [
  {
    type: 'function',
    name: 'isDeviceVerified',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export const isDeviceVerifiedOnChain = async ({
  publicClient,
  accountAddress,
}: {
  publicClient: PublicClient;
  accountAddress: Address;
}): Promise<boolean> => {
  const registryAddress = CHAINORA_PROTOCOL_ADDRESSES.registry;
  if (!isAddress(registryAddress) || registryAddress.toLowerCase() === ZERO_ADDRESS.toLowerCase()) {
    return true;
  }

  const deviceAdapterAddress = await publicClient.readContract({
    address: getAddress(registryAddress),
    abi: REGISTRY_ABI,
    functionName: 'deviceAdapter',
  });

  const normalizedDeviceAdapter = String(deviceAdapterAddress ?? '').trim();
  if (!isAddress(normalizedDeviceAdapter) || normalizedDeviceAdapter.toLowerCase() === ZERO_ADDRESS.toLowerCase()) {
    return true;
  }

  const verified = await publicClient.readContract({
    address: getAddress(normalizedDeviceAdapter),
    abi: DEVICE_ADAPTER_READ_ABI,
    functionName: 'isDeviceVerified',
    args: [getAddress(accountAddress)],
  });

  return Boolean(verified);
};

export const buildDeviceAttestPayload = ({
  apiBase,
  accountAddress,
  requestId,
}: {
  apiBase: string;
  accountAddress: Address;
  requestId: string;
}): string => {
  return buildQrPayload({
    feature: DEVICE_ATTEST_QR_FEATURE,
    apiBase,
    data: {
      requestId,
      apiBase,
      address: accountAddress,
      factoryAddress: CHAINORA_PROTOCOL_ADDRESSES.factory,
    },
  });
};
