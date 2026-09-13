import { Redirect } from "expo-router";
import { useConnectionStore } from "@/store/connection";

export default function Index() {
  const { isSignedIn } = useConnectionStore();
  return isSignedIn ? <Redirect href="/(main)" /> : <Redirect href="/(auth)/sign-in" />;
}
