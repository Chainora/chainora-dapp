import { Navigate, useNavigate } from "@tanstack/react-router";

import {
  type ChangeEvent,
  type ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  decodeEventLog,
  getAddress,
  isAddress,
  parseUnits,
  type Address,
} from "viem";
import { useAccount, usePublicClient } from "wagmi";

import { DeviceAttestDialog } from "../components/wallet/DeviceAttestDialog";
import { chainoraApiBase } from "../configs/api";
import { FACTORY_ABI } from "../contract/chainoraAbis";
import {
  CHAINORA_PROTOCOL_ADDRESSES,
  ZERO_ADDRESS,
} from "../contract/chainoraAddresses";
import { useAuth } from "../context/AuthContext";
import {
  CURRENCY_DECIMALS,
  createGroupSchema,
  type CreateGroupInput,
  defaultForm,
  toContractDurations,
} from "../features/create-group/formSchema";
import { resolveCreatorEVMAddress } from "../features/create-group/status";
import {
  DASHBOARD_FORCE_SYNC_ONCE_KEY,
  DASHBOARD_PREFERRED_MODE_KEY,
} from "../features/dashboard/constants";
import {
  readDashboardGroupCache,
  readJoinedPoolIdCache,
  writeDashboardGroupCache,
  writeJoinedPoolIdCache,
} from "../features/dashboard/cache";
import type { ApiGroup } from "../services/groupsService";
import { Step1Basic } from "../features/create-group/wizard/Step1Basic";
import { Step2Timing } from "../features/create-group/wizard/Step2Timing";
import { Step3Financial } from "../features/create-group/wizard/Step3Financial";
import { Step4Review } from "../features/create-group/wizard/Step4Review";
import { WizardShell } from "../features/create-group/wizard/WizardShell";
import { ToastStack } from "../features/group-detail/components/ToastStack";
import type { UiToast } from "../features/group-detail/types";
import type {
  DurationForm,
  FieldErrors,
  FormState,
} from "../features/create-group/types";
import { useAuthFetch } from "../hooks/useAuthFetch";
import { useDeviceAttestationGate } from "../hooks/useDeviceAttestationGate";
import { useRelayAbiWriteExecutor } from "../hooks/useRelayAbiWriteExecutor";
import {
  syncGroupStateAfterTx,
  waitForGroupProjectionSync,
} from "../services/groupStateSync";
import { uploadMediaImage } from "../services/mediaService";
import { createGroupRecord } from "../services/groupsService";

const DEFAULT_DASHBOARD_QUERY_KEY = "|created_at|desc||";

type WizardStep = 0 | 1 | 2 | 3;

type CreateGroupWalletFlowState =
  | "idle"
  | "connecting"
  | "awaiting_wallet_approval"
  | "awaiting_card"
  | "broadcasting"
  | "confirmed"
  | "attest_required"
  | "error";

const STEP_PATHS: Record<0 | 1 | 2, ReadonlyArray<keyof FormState>> = {
  0: [
    "name",
    "description",
    "groupImageUrl",
    "groupVisibility",
    "targetMembers",
  ],
  1: ["periodDuration", "auctionWindow", "contributionWindow"],
  2: ["amountPerPeriod", "minReputationScore"],
};

const STEP_TITLES: Record<WizardStep, ReactNode> = {
  0: (
    <>
      Create <em>group</em>.
    </>
  ),
  1: (
    <>
      How long is <em>each cycle</em>?
    </>
  ),
  2: (
    <>
      Set the <em>amount & gate</em>.
    </>
  ),
  3: (
    <>
      Review & <em>sign to deploy</em>.
    </>
  ),
};

const STEP_INTROS: Record<WizardStep, string> = {
  0: "Basics shown to invited members. You can edit name and description later; member count locks at deploy.",
  1: "The pool starts when all members deposit. Define how long one cycle is and how time splits within it.",
  2: "How much each member contributes per cycle, and the minimum reputation required to join.",
  3: "Final summary. After signing, the contract deploys to Chainora and you receive an invite QR.",
};

const STEP_NEXT_LABELS: Record<0 | 1 | 2, string> = {
  0: "Next · Cadence",
  1: "Next · Finance",
  2: "Next · Review",
};

const STEP_BACK_LABELS: Record<1 | 2 | 3, string> = {
  1: "Back · Basics",
  2: "Back · Cadence",
  3: "Back · Finance",
};

const PATH_TO_STEP: Record<keyof FormState, 0 | 1 | 2> = {
  name: 0,
  description: 0,
  groupImageUrl: 0,
  groupVisibility: 0,
  targetMembers: 0,
  periodDuration: 1,
  auctionWindow: 1,
  contributionWindow: 1,
  amountPerPeriod: 2,
  minReputationScore: 2,
};

const mergeGroupIntoList = (
  current: ApiGroup[],
  incoming: ApiGroup,
): ApiGroup[] => {
  const filtered = current.filter(
    (group) =>
      group.poolId.trim().toLowerCase() !==
      incoming.poolId.trim().toLowerCase(),
  );
  return [incoming, ...filtered];
};

const primeDashboardCacheWithGroup = (
  group: ApiGroup,
  isPublic: boolean,
  viewerAddress: string,
): void => {
  if (typeof window === "undefined") {
    return;
  }

  const modes: Array<"joined" | "public"> = isPublic
    ? ["joined", "public"]
    : ["joined"];
  for (const mode of modes) {
    const existing =
      readDashboardGroupCache(
        mode,
        DEFAULT_DASHBOARD_QUERY_KEY,
        viewerAddress,
      ) ?? [];
    writeDashboardGroupCache(
      mode,
      DEFAULT_DASHBOARD_QUERY_KEY,
      mergeGroupIntoList(existing, group),
      viewerAddress,
    );
  }
};

const primeJoinedPoolCache = (viewerAddress: string, poolId: string): void => {
  if (!viewerAddress || !poolId) {
    return;
  }

  const existing = readJoinedPoolIdCache(viewerAddress);
  const lowered = poolId.trim().toLowerCase();
  if (existing.some((item) => item.trim().toLowerCase() === lowered)) {
    return;
  }
  writeJoinedPoolIdCache(viewerAddress, [poolId, ...existing]);
};

const mapCreateGroupWalletStatus = (
  state: CreateGroupWalletFlowState,
): string => {
  switch (state) {
    case "connecting":
      return "Connecting wallet session…";
    case "awaiting_wallet_approval":
      return "Preparing create-group transaction…";
    case "awaiting_card":
      return "Approve in native app and sign with your card.";
    case "broadcasting":
      return "Broadcasting transaction and waiting for confirmation…";
    case "confirmed":
      return "Group created successfully.";
    case "attest_required":
      return "Device verification required before create-group.";
    case "error":
      return "Could not create group.";
    default:
      return "Review your group details, then confirm with wallet.";
  }
};

const extractRevertDetail = (message: string): string => {
  const trimmed = message.trim();
  if (!trimmed) {
    return "";
  }

  const failedExecuteMatch = trimmed.match(
    /failed to execute message;[^\n\r]*/i,
  );
  if (failedExecuteMatch) {
    return failedExecuteMatch[0].trim();
  }

  const executionRevertedMatch = trimmed.match(
    /execution reverted(?::\s*([^\n\r]+))?/i,
  );
  if (executionRevertedMatch) {
    const reason = (executionRevertedMatch[1] ?? "").trim();
    return reason ? `execution reverted: ${reason}` : "execution reverted";
  }

  if (trimmed.toLowerCase().includes("reverted")) {
    return "execution reverted";
  }

  return "";
};

const normalizeCreateGroupError = (raw: unknown): string => {
  const fallback = "Could not create group. Please try again.";
  const message =
    raw instanceof Error ? raw.message.trim() : String(raw ?? "").trim();
  const providerCode =
    typeof raw === "object" && raw !== null && "code" in raw
      ? Number((raw as { code?: unknown }).code)
      : Number.NaN;
  if (providerCode === 4001) {
    return "Request canceled in Chainora Wallet. No transaction was sent.";
  }
  if (!message) {
    return fallback;
  }

  const lower = message.toLowerCase();
  if (
    lower.includes("user rejected") ||
    lower.includes("request rejected in mobile wallet")
  ) {
    return "Request canceled in Chainora Wallet. No transaction was sent.";
  }
  const revertDetail = extractRevertDetail(message);
  if (revertDetail) {
    return `Transaction reverted on-chain: ${revertDetail}`;
  }

  if (
    lower.includes("mobile peer is not connected") ||
    lower.includes("relay websocket is not connected") ||
    lower.includes("wallet relay account is not connected") ||
    lower.includes("relay session disconnected")
  ) {
    return "Wallet relay session disconnected. Please reconnect wallet and scan QR again.";
  }

  if (
    lower.includes("session account mismatch") ||
    lower.includes("switch active account before approving this request") ||
    (lower.includes("account") && lower.includes("mismatch"))
  ) {
    return "Wallet account mismatch for this session. Reconnect this tab and scan QR with the matching account.";
  }

  if (lower.includes("relay request timeout")) {
    return "Native wallet did not approve in time. Please retry and confirm on mobile.";
  }

  if (
    lower.includes("nonce") ||
    lower.includes("sequence") ||
    lower.includes("invalid parameters") ||
    lower.includes("rpc")
  ) {
    return fallback;
  }

  return message;
};

const decodePoolCreatedFromReceipt = (
  logs: readonly {
    address: Address;
    data: `0x${string}`;
    topics: readonly `0x${string}`[];
  }[],
  factoryAddress: Address,
): { poolAddress: Address; poolId: string } => {
  for (const log of logs) {
    if (log.address.toLowerCase() !== factoryAddress.toLowerCase()) {
      continue;
    }

    try {
      const decoded = decodeEventLog({
        abi: FACTORY_ABI,
        data: log.data,
        topics: [...log.topics] as [`0x${string}`, ...`0x${string}`[]],
        strict: false,
      });

      if (decoded.eventName !== "ChainoraPoolCreated") {
        continue;
      }

      return {
        poolAddress: getAddress(String(decoded.args.pool)),
        poolId: String(decoded.args.poolId),
      };
    } catch {
      // Ignore non-matching logs.
    }
  }

  throw new Error(
    "Transaction confirmed but ChainoraPoolCreated event was not found.",
  );
};

const getOwnerLabel = (address: string | null): string => {
  if (!address) {
    return "C";
  }
  const trimmed = address.trim();
  if (!trimmed) {
    return "C";
  }
  const idx = trimmed.toLowerCase().startsWith("0x") ? 2 : 0;
  const slice = trimmed.slice(idx, idx + 2);
  return (slice || "C").toUpperCase();
};

export function CreateGroupPage() {
  const navigate = useNavigate();
  const { token, isAuthenticated, address, initAddress } = useAuth();
  const { authFetch } = useAuthFetch();
  const executeAbiWrite = useRelayAbiWriteExecutor();
  const { address: connectedWalletAddressRaw } = useAccount();
  const publicClient = usePublicClient();

  const connectedWalletAddress = useMemo(() => {
    if (!connectedWalletAddressRaw || !isAddress(connectedWalletAddressRaw)) {
      return null;
    }
    return getAddress(connectedWalletAddressRaw);
  }, [connectedWalletAddressRaw]);

  const creatorEVMAddress = useMemo(
    () => resolveCreatorEVMAddress(address, initAddress),
    [address, initAddress],
  );

  const actionAddress = useMemo<Address | null>(() => {
    if (creatorEVMAddress && isAddress(creatorEVMAddress)) {
      return getAddress(creatorEVMAddress);
    }
    if (connectedWalletAddress && isAddress(connectedWalletAddress)) {
      return getAddress(connectedWalletAddress);
    }
    return null;
  }, [connectedWalletAddress, creatorEVMAddress]);

  const ownerLabel = useMemo(
    () => getOwnerLabel(actionAddress),
    [actionAddress],
  );

  const attestationGate = useDeviceAttestationGate({
    publicClient,
    accountAddress: actionAddress,
    apiBase: chainoraApiBase,
  });

  const [activeStep, setActiveStep] = useState<WizardStep>(0);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isUploadingGroupImage, setIsUploadingGroupImage] = useState(false);
  const [reviewFlowState, setReviewFlowState] =
    useState<CreateGroupWalletFlowState>("idle");
  const [reviewError, setReviewError] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isCreatePoolSuccess, setIsCreatePoolSuccess] = useState(false);
  const [toasts, setToasts] = useState<UiToast[]>([]);

  const reviewStatusMessage = useMemo(() => {
    if (reviewFlowState === "error" && reviewError.trim()) {
      return reviewError.trim();
    }
    return mapCreateGroupWalletStatus(reviewFlowState);
  }, [reviewError, reviewFlowState]);

  const dismissToast = useCallback((id: number) => {
    setToasts((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback((tone: UiToast["tone"], message: string) => {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    const id = Date.now() + Math.floor(Math.random() * 10_000);
    setToasts((previous) => [...previous, { id, tone, message: trimmed }]);
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        setToasts((previous) => previous.filter((item) => item.id !== id));
      }, 5_000);
    }
  }, []);

  const setField = useCallback((field: keyof FormState, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  }, []);

  const setDurationField = useCallback(
    (
      field: "periodDuration" | "auctionWindow" | "contributionWindow",
      value: DurationForm,
    ) => {
      setForm((previous) => ({ ...previous, [field]: value }));
      setErrors((previous) => ({ ...previous, [field]: undefined }));
    },
    [],
  );

  const onGroupImageChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) {
        return;
      }

      if (!file.type.startsWith("image/")) {
        setErrors((previous) => ({
          ...previous,
          groupImageUrl: "Please select an image file.",
        }));
        return;
      }

      setIsUploadingGroupImage(true);
      setErrors((previous) => ({ ...previous, groupImageUrl: undefined }));

      try {
        const upload = await uploadMediaImage(authFetch, file, "group");
        setForm((previous) => ({ ...previous, groupImageUrl: upload.url }));
      } catch (uploadError) {
        const message =
          uploadError instanceof Error
            ? uploadError.message
            : "Unable to upload group image";
        setErrors((previous) => ({ ...previous, groupImageUrl: message }));
      } finally {
        setIsUploadingGroupImage(false);
      }
    },
    [authFetch],
  );

  const collectIssueErrors = useCallback(
    (
      paths: ReadonlyArray<keyof FormState> | null,
    ): { errors: FieldErrors; firstStep: 0 | 1 | 2 | null } => {
      const result = createGroupSchema.safeParse(form);
      if (result.success) {
        return { errors: {}, firstStep: null };
      }

      const owned = paths ? new Set(paths) : null;
      const collected: FieldErrors = {};
      let firstStep: 0 | 1 | 2 | null = null;

      for (const issue of result.error.issues) {
        const path = issue.path[0];
        if (typeof path !== "string") {
          continue;
        }
        const key = path as keyof FormState;
        if (owned && !owned.has(key)) {
          continue;
        }
        if (!(key in collected)) {
          collected[key as keyof FieldErrors] = issue.message;
        }
        const ownerStep = PATH_TO_STEP[key];
        if (firstStep === null || ownerStep < firstStep) {
          firstStep = ownerStep;
        }
      }

      return { errors: collected, firstStep };
    },
    [form],
  );

  const validateCurrentStep = useCallback(
    (step: 0 | 1 | 2): boolean => {
      const { errors: stepErrors } = collectIssueErrors(STEP_PATHS[step]);
      setErrors((previous) => {
        const next = { ...previous };
        for (const key of STEP_PATHS[step]) {
          delete next[key as keyof FieldErrors];
        }
        return { ...next, ...stepErrors };
      });
      return Object.keys(stepErrors).length === 0;
    },
    [collectIssueErrors],
  );

  const goNext = useCallback(() => {
    if (activeStep === 3) {
      return;
    }

    if (activeStep === 2) {
      const { errors: allErrors, firstStep } = collectIssueErrors(null);
      if (Object.keys(allErrors).length > 0) {
        setErrors(allErrors);
        if (firstStep !== null) {
          setActiveStep(firstStep);
        }
        return;
      }
      setErrors({});
      setActiveStep(3);
      return;
    }

    // activeStep is now narrowed to 0 | 1
    if (validateCurrentStep(activeStep)) {
      setActiveStep(activeStep === 0 ? 1 : 2);
    }
  }, [activeStep, collectIssueErrors, validateCurrentStep]);

  const goBack = useCallback(() => {
    setActiveStep((previous) => Math.max(0, previous - 1) as WizardStep);
  }, []);

  const goToStep = useCallback((step: 0 | 1 | 2) => {
    setActiveStep(step);
  }, []);

  const onCancel = useCallback(() => {
    void navigate({ to: "/dashboard" });
  }, [navigate]);

  const navigateToDashboardAfterCreate = useCallback(() => {
    if (typeof window !== "undefined") {
      const preferredMode =
        form.groupVisibility === "private" ? "joined" : "public";
      window.sessionStorage.setItem(
        DASHBOARD_PREFERRED_MODE_KEY,
        preferredMode,
      );
      window.sessionStorage.setItem(DASHBOARD_FORCE_SYNC_ONCE_KEY, "1");
    }

    void navigate({ to: "/dashboard" });
  }, [form.groupVisibility, navigate]);

  const executeCreateGroup = useCallback(
    async (input: CreateGroupInput) => {
      if (!publicClient) {
        throw new Error(
          "RPC client is not ready. Please refresh and try again.",
        );
      }
      if (!actionAddress) {
        throw new Error("Please log in again to continue.");
      }
      if (!token.trim()) {
        throw new Error("Session expired. Please log in again.");
      }
      if (
        CHAINORA_PROTOCOL_ADDRESSES.factory.toLowerCase() ===
        ZERO_ADDRESS.toLowerCase()
      ) {
        throw new Error("Factory contract is not configured.");
      }

      setIsSubmittingReview(true);
      setReviewError("");
      setReviewFlowState("awaiting_wallet_approval");

      try {
        const contractTimes = toContractDurations(
          input.periodDuration,
          input.auctionWindow,
          input.contributionWindow,
        );
        const contributionAmountWei = parseUnits(
          input.amountPerPeriod,
          CURRENCY_DECIMALS,
        );
        const createPoolArgs = [
          {
            contributionAmount: contributionAmountWei,
            minReputation: BigInt(input.minReputationScore),
            targetMembers: input.targetMembers,
            periodDuration: contractTimes.periodDurationSeconds,
            contributionWindow: contractTimes.contributionWindowSeconds,
            auctionWindow: contractTimes.auctionWindowSeconds,
          },
          input.groupVisibility === "public",
        ] as const;
        const { txHash, receipt } = await executeAbiWrite({
          actionKey: "create_group",
          expectedAccountAddress: actionAddress,
          contractAddress: CHAINORA_PROTOCOL_ADDRESSES.factory,
          abi: FACTORY_ABI,
          functionName: "createPool",
          args: createPoolArgs,
          onStageChange: (stage) => {
            switch (stage) {
              case "connecting":
                setReviewFlowState("connecting");
                break;
              case "processing":
                setReviewFlowState("awaiting_wallet_approval");
                break;
              case "awaiting_native":
                setReviewFlowState("awaiting_card");
                break;
              case "broadcasting":
                setReviewFlowState("broadcasting");
                break;
              case "confirmed":
                setReviewFlowState("confirmed");
                break;
              case "error":
                setReviewFlowState("error");
                break;
              default:
                break;
            }
          },
        });

        const created = decodePoolCreatedFromReceipt(
          receipt.logs as readonly {
            address: Address;
            data: `0x${string}`;
            topics: readonly `0x${string}`[];
          }[],
          CHAINORA_PROTOCOL_ADDRESSES.factory,
        );

        const persistedGroup = await createGroupRecord(token.trim(), {
          poolId: created.poolId,
          poolAddress: created.poolAddress,
          name: input.name,
          description: input.description,
          groupImageUrl: input.groupImageUrl?.trim() || "",
          publicRecruitment: input.groupVisibility === "public",
          contributionAmount: contributionAmountWei.toString(),
          minReputation: String(input.minReputationScore),
          targetMembers: input.targetMembers,
          periodDuration: contractTimes.periodDurationSeconds,
          contributionWindow: contractTimes.contributionWindowSeconds,
          auctionWindow: contractTimes.auctionWindowSeconds,
          txHash,
        });

        primeDashboardCacheWithGroup(
          persistedGroup,
          input.groupVisibility === "public",
          actionAddress,
        );
        primeJoinedPoolCache(actionAddress, persistedGroup.poolId);

        setIsCreatePoolSuccess(true);
        setReviewFlowState("confirmed");
        pushToast("success", "Group created successfully.");

        void (async () => {
          try {
            const projectionSync = await waitForGroupProjectionSync({
              accessToken: token.trim(),
              poolId: created.poolId,
              txHash,
            });
            const synced = await syncGroupStateAfterTx({
              accessToken: token.trim(),
              poolId: created.poolId,
              targets: ["overview"],
            });
            const finalGroup = synced.overview ?? persistedGroup;
            primeDashboardCacheWithGroup(
              finalGroup,
              input.groupVisibility === "public",
              actionAddress,
            );
            primeJoinedPoolCache(actionAddress, finalGroup.poolId);
            if (projectionSync.timedOut) {
              console.warn("[create-group] backend projection sync delayed", {
                poolId: created.poolId,
                txHash,
              });
            }
          } catch (syncError) {
            console.warn("[create-group] post-submit sync failed", syncError);
          }
        })();
      } catch (error) {
        const message = normalizeCreateGroupError(error);
        setReviewFlowState("error");
        setReviewError(message);
        pushToast("error", message);
        throw error;
      } finally {
        setIsSubmittingReview(false);
      }
    },
    [actionAddress, executeAbiWrite, publicClient, pushToast, token],
  );

  const onSign = useCallback(async () => {
    const result = createGroupSchema.safeParse(form);
    if (!result.success) {
      const { errors: allErrors, firstStep } = collectIssueErrors(null);
      setErrors(allErrors);
      if (firstStep !== null) {
        setActiveStep(firstStep);
      }
      return;
    }
    if (!actionAddress) {
      pushToast("error", "Please log in again to continue.");
      return;
    }

    setReviewError("");
    setReviewFlowState("awaiting_wallet_approval");

    try {
      const started = await attestationGate.runWithGate(async () => {
        await executeCreateGroup(result.data);
      });

      if (!started) {
        setReviewFlowState("attest_required");
      }
    } catch (error) {
      const message = normalizeCreateGroupError(error);
      setReviewFlowState("error");
      setReviewError(message);
      setIsSubmittingReview(false);
    }
  }, [
    actionAddress,
    attestationGate,
    collectIssueErrors,
    executeCreateGroup,
    form,
    pushToast,
  ]);

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  const back =
    activeStep > 0
      ? { label: STEP_BACK_LABELS[activeStep as 1 | 2 | 3], onClick: goBack }
      : undefined;
  const next =
    activeStep < 3
      ? { label: STEP_NEXT_LABELS[activeStep as 0 | 1 | 2], onClick: goNext }
      : undefined;

  const isSignDisabled =
    isSubmittingReview ||
    (reviewFlowState !== "idle" &&
      reviewFlowState !== "error" &&
      reviewFlowState !== "attest_required");

  return (
    <>
      <WizardShell
        activeStep={activeStep}
        title={STEP_TITLES[activeStep]}
        intro={STEP_INTROS[activeStep]}
        onCancel={onCancel}
        back={back}
        next={next}
        helperText="You can return to any step before signing."
      >
        {activeStep === 0 ? (
          <Step1Basic
            form={form}
            errors={errors}
            setField={setField}
            isUploadingGroupImage={isUploadingGroupImage}
            onGroupImageChange={onGroupImageChange}
            ownerAddress={actionAddress}
            ownerLabel={ownerLabel}
          />
        ) : null}
        {activeStep === 1 ? (
          <Step2Timing
            form={form}
            errors={errors}
            setDurationField={setDurationField}
          />
        ) : null}
        {activeStep === 2 ? (
          <Step3Financial form={form} errors={errors} setField={setField} />
        ) : null}
        {activeStep === 3 ? (
          <Step4Review
            form={form}
            ownerAddress={actionAddress}
            ownerLabel={ownerLabel}
            statusMessage={reviewStatusMessage}
            reviewError={reviewError}
            isSubmitting={isSubmittingReview}
            isSuccess={isCreatePoolSuccess}
            isSignDisabled={isSignDisabled}
            onEditStep={goToStep}
            onSign={() => {
              void onSign();
            }}
            onGoToDashboard={navigateToDashboardAfterCreate}
          />
        ) : null}
      </WizardShell>

      <DeviceAttestDialog
        open={attestationGate.isDialogOpen}
        statusMessage={attestationGate.statusMessage}
        qrImageUrl={attestationGate.qrImageUrl}
        isChecking={attestationGate.isChecking}
        onClose={attestationGate.closeDialog}
        onConfirm={() => {
          void attestationGate.confirmAttestationAndResume().catch((error) => {
            const message = normalizeCreateGroupError(error);
            setReviewFlowState("error");
            setReviewError(message);
            pushToast("error", message);
          });
        }}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
