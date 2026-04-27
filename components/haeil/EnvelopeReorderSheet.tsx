import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Envelope } from "@/lib/types";
import { SortableList } from "./SortableList";

type Props = {
  visible: boolean;
  envelopes: Envelope[];
  onReorder: (newEnvelopes: Envelope[]) => void;
  onClose: () => void;
};

export function EnvelopeReorderSheet({ visible, envelopes, onReorder, onClose }: Props) {
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
            maxHeight: "60%",
          }}
        >
          {/* 핸들 */}
          <View
            style={{
              width: 40, height: 4, borderRadius: 2,
              backgroundColor: "#D9D9D9", alignSelf: "center", marginBottom: 16,
            }}
          />

          <Text
            style={{
              fontSize: 13, fontWeight: "600", color: "#999",
              paddingHorizontal: 20, marginBottom: 4, letterSpacing: 0.3,
            }}
          >
            envelope 순서 변경
          </Text>
          <Text
            style={{
              fontSize: 13, color: "#999",
              paddingHorizontal: 20, marginBottom: 12,
            }}
          >
            꾹 누른 채 드래그하세요
          </Text>

          <SortableList
            data={envelopes}
            keyExtractor={(e) => e.id}
            onReorder={onReorder}
            itemHeight={52}
            renderItem={(env, _, dh) => (
              <Pressable
                onLongPress={dh.onLongPress}
                onPressOut={dh.onPressOut}
                delayLongPress={dh.delayLongPress}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    borderTopWidth: 0.5,
                    borderTopColor: "#f0f0eb",
                    backgroundColor: "#fff",
                  }}
                >
                  <View
                    style={{
                      width: 8, height: 8, borderRadius: 4,
                      backgroundColor: env.color ?? "#1D9E75", marginRight: 12,
                    }}
                  />
                  <Text style={{ flex: 1, fontSize: 15, color: "#1a1a1a" }}>{env.name}</Text>
                  <Text style={{ fontSize: 16, color: "#ccc" }}>⠿</Text>
                </View>
              </Pressable>
            )}
          />
        </View>
      </Pressable>
    </Modal>
  );
}
