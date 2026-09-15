import * as React from "react";
import { FlatList, Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { Search01Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { fetchAccounts, updateCharacterOwner } from "@/store/admin-api";
import { useToastStore } from "@/store/toast-store";

export interface OwnerPickerProps {
  characterId: string;
  currentOwnerId: string | null;
  serverHost: string;
  token: string;
  onChanged: () => void;
}

export function OwnerPicker({
  characterId,
  currentOwnerId,
  serverHost,
  token,
  onChanged,
}: OwnerPickerProps) {
  const [search, setSearch] = React.useState("");
  const [users, setUsers] = React.useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const loadUsers = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const { accounts } = await fetchAccounts(serverHost, token);
      const filtered = accounts
        .filter((a) => a.name.toLowerCase().includes(debouncedSearch.toLowerCase()))
        .map((a) => ({ id: a.id, name: a.name }));
      setUsers(filtered);
    } catch (_e) {
      useToastStore.getState().notify("Failed to load users", "bad");
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, serverHost, token]);

  React.useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSelect = async (userId: string) => {
    try {
      await updateCharacterOwner(serverHost, token, characterId, userId);
      onChanged();
      useToastStore.getState().notify("Owner updated", "good");
    } catch (_e) {
      useToastStore.getState().notify("Failed to update owner", "bad");
    }
  };

  return (
    <View className="gap-2">
      <Input
        leading={Search01Icon}
        placeholder="Search users..."
        value={search}
        onChangeText={setSearch}
      />
      <View className="max-h-60 overflow-hidden rounded-card border border-border bg-canvas-dark">
        <FlatList
          data={users}
          keyExtractor={(u) => u.id}
          renderItem={({ item }) => (
            <Button
              variant="ghost"
              className={cn(
                "justify-start px-3 py-3",
                item.id === currentOwnerId && "bg-primary/10",
              )}
              onPress={() => handleSelect(item.id)}
              textClassName={cn(
                "font-ui text-sm",
                item.id === currentOwnerId ? "text-primary font-bold" : "text-text-primary",
              )}
            >
              {item.name}
            </Button>
          )}
          ListEmptyComponent={
            <Text className="p-4 text-center font-ui text-xs text-text-muted">
              {isLoading ? "Loading..." : "No users found"}
            </Text>
          }
        />
      </View>
    </View>
  );
}
