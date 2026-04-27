import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Envelope } from "@/lib/types";

type Props = {
  visible: boolean;
  envelopes: Envelope[];
  onSelect: (envelopeId: string) => void;
  onClose: () => void;
};

export function ClassifySheet({ visible, envelopes, onSelect, onClose }: Props) {
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
              fontSize: 13,
              fontWeight: "600",
              color: "#999",
              paddingHorizontal: 20,
              marginBottom: 8,
              letterSpacing: 0.3,
            }}
          >
            어느 envelope로 분류할까요?
          </Text>

          {envelopes.length === 0 ? (
            <Text style={{ fontSize: 14, color: "#aaa", textAlign: "center", paddingVertical: 32 }}>
              envelope가 없습니다
            </Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {envelopes.map((env) => (
                <Pressable
                  key={env.id}
                  onPress={() => { onSelect(env.id); onClose(); }}
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
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: env.color ?? "#1D9E75",
                        marginRight: 12,
                      }}
                    />
                    <Text style={{ fontSize: 15, color: "#1a1a1a" }}>{env.name}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}
