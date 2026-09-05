import { Redirect } from "expo-router";
import { useConnectionStore } from "@/store/connection";

export default function Index() {
  const { isPaired } = useConnectionStore();
  return isPaired ? <Redirect href="/(main)" /> : <Redirect href="/(auth)/pairing" />;
}
