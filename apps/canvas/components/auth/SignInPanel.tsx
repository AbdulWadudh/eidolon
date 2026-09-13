import { AUTH, AUTH_COPY, UI_MS } from "@eidolon/config";
import * as React from "react";
import { ActivityIndicator, Text, type TextInput, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlertCircleIcon, Mail01Icon, SquareLock01Icon, UserIcon } from "@/lib/icons";
import { select } from "@/services/haptics";
import { type Account, signIn, signUp } from "@/store/auth-store";
import { useResolvedTheme } from "@/store/theme-store";

export interface SignInPanelProps {
  host: string;
  onSignedIn: (token: string, account: Account) => Promise<void> | void;
}

function emailLooksValid(email: string): boolean {
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  return at > 0 && trimmed.indexOf(".", at) > at + 1 && !trimmed.endsWith(".");
}

export function SignInPanel({ host, onSignedIn }: SignInPanelProps) {
  const reduced = useReducedMotion();
  const theme = useResolvedTheme();

  const [isNew, setIsNew] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [isWorking, setWorking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const emailField = React.useRef<TextInput>(null);
  const passwordField = React.useRef<TextInput>(null);

  const isFilled =
    email.trim().length > 0 && password.length > 0 && (!isNew || name.trim().length > 0);

  const submit = React.useCallback(async () => {
    if (!host.trim() || !isFilled) {
      setError(AUTH_COPY.missingFields);
      return;
    }

    if (!emailLooksValid(email)) {
      setError(AUTH_COPY.emailLooksWrong);
      emailField.current?.focus();
      return;
    }

    if (isNew && password.length < AUTH.minPasswordLength) {
      setError(AUTH_COPY.passwordTooShort);
      passwordField.current?.focus();
      return;
    }

    setWorking(true);
    setError(null);

    try {
      const credentials = { email: email.trim(), password, name: name.trim() };
      const result = isNew ? await signUp(host, credentials) : await signIn(host, credentials);
      await onSignedIn(result.token, result.account);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "";
      setError(message.length > 0 ? message : AUTH_COPY.failed);
      setWorking(false);
    }
  }, [email, host, isFilled, isNew, name, onSignedIn, password]);

  return (
    <Card className="mt-2 flex-col gap-3">
      <Text className="font-ui-bold text-sm text-text-primary">
        {isNew ? AUTH_COPY.signUpTitle : AUTH_COPY.signInTitle}
      </Text>

      {isNew ? (
        <Field label={AUTH_COPY.nameLabel}>
          <Input
            leading={UserIcon}
            value={name}
            onChangeText={setName}
            placeholder={AUTH_COPY.namePlaceholder}
            autoCapitalize="words"
            autoCorrect={false}
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => emailField.current?.focus()}
            editable={!isWorking}
          />
        </Field>
      ) : null}

      <Field label={AUTH_COPY.emailLabel}>
        <Input
          ref={emailField}
          leading={Mail01Icon}
          value={email}
          onChangeText={setEmail}
          placeholder={AUTH_COPY.emailPlaceholder}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          keyboardType="email-address"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordField.current?.focus()}
          editable={!isWorking}
        />
      </Field>

      <Field label={AUTH_COPY.passwordLabel}>
        <Input
          ref={passwordField}
          leading={SquareLock01Icon}
          value={password}
          onChangeText={setPassword}
          placeholder={isNew ? AUTH_COPY.passwordPlaceholder : undefined}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={isNew ? "new-password" : "current-password"}
          textContentType={isNew ? "newPassword" : "password"}
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
          editable={!isWorking}
        />
      </Field>

      {error ? (
        <Animated.View
          entering={FadeIn.duration(reduced ? UI_MS.revealReduced : UI_MS.disclosure)}
          className="flex-row items-start gap-2"
        >
          <AppIcon icon={AlertCircleIcon} size={14} color={theme.danger} />
          <Text
            accessibilityLiveRegion="assertive"
            className="flex-1 font-ui-medium text-xs text-danger"
          >
            {error}
          </Text>
        </Animated.View>
      ) : null}

      <Button variant="default" disabled={isWorking || !isFilled} onPress={() => void submit()}>
        {isWorking ? (
          <View className="flex-row items-center gap-2">
            <ActivityIndicator size="small" color={theme.primaryForeground} />
            <Text className="font-semibold font-ui-medium text-primary-foreground text-sm">
              {AUTH_COPY.working}
            </Text>
          </View>
        ) : isNew ? (
          AUTH_COPY.signUpAction
        ) : (
          AUTH_COPY.signInAction
        )}
      </Button>

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={isNew ? AUTH_COPY.switchToSignIn : AUTH_COPY.switchToSignUp}
        hitSlop={8}
        disabled={isWorking}
        onPress={() => {
          select();
          setIsNew((prev) => !prev);
          setError(null);
        }}
        className="h-9 items-center justify-center"
      >
        <Text className="text-center font-ui text-primary text-xs">
          {isNew ? AUTH_COPY.switchToSignIn : AUTH_COPY.switchToSignUp}
        </Text>
      </PressableScale>

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
