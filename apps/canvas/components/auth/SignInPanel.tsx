import { AUTH_COPY, UI_MS } from "@eidolon/config";
import * as React from "react";
import { Text, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { type Account, signIn, signUp } from "@/store/auth-store";

export interface SignInPanelProps {
  host: string;
  onSignedIn: (token: string, account: Account) => Promise<void> | void;
}

export function SignInPanel({ host, onSignedIn }: SignInPanelProps) {
  const reduced = useReducedMotion();

  const [isNew, setIsNew] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [isWorking, setWorking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = React.useCallback(async () => {
    if (!host.trim() || !email.trim() || !password) {
      setError(AUTH_COPY.missingFields);
      return;
    }

    setWorking(true);
    setError(null);

    try {
      const credentials = { email, password, name };
      const result = isNew ? await signUp(host, credentials) : await signIn(host, credentials);
      await onSignedIn(result.token, result.account);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "";
      setError(message.length > 0 ? message : AUTH_COPY.failed);
      setWorking(false);
    }
  }, [email, host, isNew, name, onSignedIn, password]);

  return (
    <Card className="mt-2 flex-col gap-3">
      <Text className="font-ui-bold text-sm text-text-primary">
        {isNew ? AUTH_COPY.signUpTitle : AUTH_COPY.signInTitle}
      </Text>

      {isNew ? (
        <Field label={AUTH_COPY.nameLabel}>
          <Input value={name} onChangeText={setName} autoCapitalize="words" autoCorrect={false} />
        </Field>
      ) : null}

      <Field label={AUTH_COPY.emailLabel}>
        <Input
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
      </Field>

      <Field label={AUTH_COPY.passwordLabel}>
        <Input
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Field>

      {error ? (
        <Animated.View entering={FadeIn.duration(reduced ? UI_MS.revealReduced : UI_MS.disclosure)}>
          <Text accessibilityLiveRegion="assertive" className="font-ui-medium text-xs text-danger">
            {error}
          </Text>
        </Animated.View>
      ) : null}

      <Button variant="default" disabled={isWorking} onPress={submit}>
        {isWorking ? AUTH_COPY.working : isNew ? AUTH_COPY.signUpAction : AUTH_COPY.signInAction}
      </Button>

      <Text
        accessibilityRole="button"
        onPress={() => {
          setIsNew((prev) => !prev);
          setError(null);
        }}
        className="text-center font-ui text-xs text-primary"
      >
        {isNew ? AUTH_COPY.switchToSignIn : AUTH_COPY.switchToSignUp}
      </Text>

      {isNew ? (
        <Text className="text-center font-ui text-[11px] text-text-muted">
          {AUTH_COPY.firstAccountNote}
        </Text>
      ) : null}
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text className="mb-1 font-ui text-xs text-text-muted">{label}</Text>
      {children}
    </View>
  );
}
