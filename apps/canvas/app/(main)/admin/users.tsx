import { AUTH, CONFIRM_COPY, DASHBOARD_COPY } from "@eidolon/config";
import * as React from "react";
import { Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { AdminEmpty, AdminScreen } from "@/components/admin/AdminScreen";
import { revealAt } from "@/components/admin/admin-motion";
import { EditableRow, useSaveState } from "@/components/admin/EditableRow";
import { Input } from "@/components/ui/input";
import {
  type AdminAccount,
  AdminRequestError,
  fetchAccounts,
  removeAccount,
  saveAccount,
} from "@/store/admin-api";
import { useAuthStore } from "@/store/auth-store";
import { useConnectionStore } from "@/store/connection";

export default function AdminUsersScreen() {
  const reduced = useReducedMotion();
  const { serverHost, pairingToken } = useConnectionStore();
  const signedInId = useAuthStore((state) => state.account?.id ?? "");

  const [accounts, setAccounts] = React.useState<AdminAccount[]>([]);
  const [isLoading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [draftName, setDraftName] = React.useState("");
  const [saveState, runSave] = useSaveState();

  const reload = React.useCallback(
    () =>
      fetchAccounts(serverHost, pairingToken)
        .then((body) => {
          setAccounts(body.accounts);
          setLoading(false);
        })
        .catch(() => {
          setError(DASHBOARD_COPY.failed);
          setLoading(false);
        }),
    [pairingToken, serverHost],
  );

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const report = React.useCallback((cause: unknown) => {
    const message = cause instanceof AdminRequestError ? cause.message : "";
    setError(message.length > 0 ? message : DASHBOARD_COPY.failed);
  }, []);

  const open = React.useCallback(
    (account: AdminAccount) => {
      if (openId === account.id) {
        setOpenId(null);
        return;
      }
      setOpenId(account.id);
      setDraftName(account.name);
    },
    [openId],
  );

  const patch = React.useCallback(
    (account: AdminAccount, body: { role?: AdminAccount["role"]; name?: string }) => {
      setError(null);
      void runSave(() =>
        saveAccount(serverHost, pairingToken, account.id, body).then(() => reload()),
      ).catch(report);
    },
    [pairingToken, reload, report, runSave, serverHost],
  );

  const remove = React.useCallback(
    (account: AdminAccount) => {
      setError(null);
      removeAccount(serverHost, pairingToken, account.id)
        .then(() => {
          setOpenId(null);
          return reload();
        })
        .catch(report);
    },
    [pairingToken, reload, report, serverHost],
  );

  return (
    <AdminScreen
      title={DASHBOARD_COPY.usersTitle}
      blurb={DASHBOARD_COPY.usersBlurb}
      isLoading={isLoading}
      error={error}
    >
      {accounts.length === 0 ? (
        <AdminEmpty />
      ) : (
        accounts.map((account, index) => {
          const isOwner = account.role === AUTH.ownerRole;
          const isSelf = account.id === signedInId;

          return (
            <Animated.View entering={revealAt(index, reduced)} key={account.id}>
              <EditableRow
                title={account.name || account.email}
                subtitle={isSelf ? `${account.email} · ${DASHBOARD_COPY.you}` : account.email}
                badge={isOwner ? DASHBOARD_COPY.ownerBadge : DASHBOARD_COPY.memberBadge}
                expanded={openId === account.id}
                onToggle={() => open(account)}
                onSave={() => patch(account, { name: draftName })}
                onRemove={isSelf ? undefined : () => remove(account)}
                removeTitle={CONFIRM_COPY.deleteAccount}
                removeBody={CONFIRM_COPY.deleteAccountBody}
                saveState={saveState}
                canSave={draftName.trim().length > 0 && draftName !== account.name}
              >
                <View className="gap-1.5">
                  <Text className="font-ui text-[11px] text-text-muted">
                    {DASHBOARD_COPY.nameLabel}
                  </Text>
                  <Input
                    value={draftName}
                    onChangeText={setDraftName}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>

                <RoleToggle isOwner={isOwner} onChange={(role) => patch(account, { role })} />
              </EditableRow>
            </Animated.View>
          );
        })
      )}
    </AdminScreen>
  );
}

function RoleToggle({
  isOwner,
  onChange,
}: {
  isOwner: boolean;
  onChange: (role: AdminAccount["role"]) => void;
}) {
  return (
    <View className="gap-1.5">
      <Text className="font-ui text-[11px] text-text-muted">{DASHBOARD_COPY.roleLabel}</Text>
      <View className="flex-row gap-2">
        <RoleChip
          label={DASHBOARD_COPY.memberBadge}
          active={!isOwner}
          onPress={() => onChange(AUTH.memberRole)}
        />
        <RoleChip
          label={DASHBOARD_COPY.ownerBadge}
          active={isOwner}
          onPress={() => onChange(AUTH.ownerRole)}
        />
      </View>
    </View>
  );
}

function RoleChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Text
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={
        active
          ? "rounded-full border border-primary bg-primary px-3 py-1.5 font-ui-medium text-primary-foreground text-xs"
          : "rounded-full border border-border px-3 py-1.5 font-ui-medium text-text-muted text-xs"
      }
    >
      {label}
    </Text>
  );
}
