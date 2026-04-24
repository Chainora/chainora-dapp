import type { PropsWithChildren } from 'react';
import { useEffect, useMemo } from 'react';
import { InterwovenKitProvider, TESTNET, injectStyles } from '@initia/interwovenkit-react';
import InterwovenKitStyles from '@initia/interwovenkit-react/styles.js';

import { interwovenBridgeConfig } from '../configs/interwoven';

export function InterwovenKitAppProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    injectStyles(InterwovenKitStyles);
  }, []);

  const providerConfig = useMemo(
    () => ({
      ...TESTNET,
      defaultChainId: interwovenBridgeConfig.providerDefaultChainId,
      ...(interwovenBridgeConfig.routerApiUrl ? { routerApiUrl: interwovenBridgeConfig.routerApiUrl } : {}),
    }),
    [],
  );

  return <InterwovenKitProvider {...providerConfig}>{children}</InterwovenKitProvider>;
}
