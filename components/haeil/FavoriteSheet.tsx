import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Item, Paper } from "@/lib/types";

type Props = {
  visible: boolean;
  favorites: Paper[];
  itemsByPaperId: Record<string, Item[]>;
  waveCounts: Record<string, number>;
  onSelect: (paper: Paper) => void;
  onClose: () => void;
};

export function FavoriteSheet({
  visible,
  favorites,
  itemsByPaperId,
  waveCounts,
  onSelect,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
        onPress={onClose}
      >
        <View
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingTop: 10,
            paddingBottom: insets.bottom + 16,
            maxHeight: "70%",
          }}
        >
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: "#D9D9D9",
              alignSelf: "center",
              marginBottom: 16,
            }}
          />

          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              color: "#999",
              paddingHorizontal: 20,
              marginBottom: 4,
              letterSpacing: 0.3,
            }}
          >
            ★ 즐겨찾기
          </Text>

          {favorites.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <Text style={{ fontSize: 14, color: "#aaa" }}>즐겨찾기한 paper가 없습니다</Text>
              <Text style={{ fontSize: 13, color: "#ccc", marginTop: 6 }}>
                완료 탭에서 ★ 탭으로 추가해보세요
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {favorites.map((paper) => {
                const items = itemsByPaperId[paper.id] ?? [];
                const waveCount = waveCounts[paper.id] ?? 0;
                const previewText = items
                  .slice(0, 3)
                  .map((i) => i.content)
                  .concat(items.length > 3 ? [`+${items.length - 3}개`] : [])
                  .join(" · ");

                return (
                  <Pressable
                    key={paper.id}
                    onPress={() => { onSelect(paper); onClose(); }}
                    style={({ pressed }) => ({
                      borderTopWidth: 0.5,
                      borderTopColor: "#f0f0eb",
                      backgroundColor: pressed ? "#f5f5f0" : "#fff",
                    })}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 20,
                        paddingVertical: 14,
                      }}
                    >
                      <View style={{ flex: 1, marginRight: 16 }}>
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: "500",
                            color: "#1a1a1a",
                            marginBottom: previewText ? 3 : 0,
                          }}
                          numberOfLines={1}
                        >
                          {paper.name}
                        </Text>
                        {!!previewText && (
                          <Text style={{ fontSize: 13, color: "#999" }} numberOfLines={1}>
                            {previewText}
                          </Text>
                        )}
                      </View>
                      {waveCount > 0 && (
                        <Text style={{ fontSize: 13, color: "#1D9E75", fontWeight: "500" }}>
                          {waveCount} waves
                        </Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}
