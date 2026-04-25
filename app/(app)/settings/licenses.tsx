import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

const LICENSES = [
  { name: "Expo", license: "MIT", url: "https://github.com/expo/expo" },
  { name: "React Native", license: "MIT", url: "https://github.com/facebook/react-native" },
  { name: "Supabase JS", license: "MIT", url: "https://github.com/supabase/supabase-js" },
  { name: "NativeWind", license: "MIT", url: "https://github.com/marklawlor/nativewind" },
  { name: "lucide-react-native", license: "ISC", url: "https://github.com/lucide-icons/lucide" },
  { name: "react-native-gesture-handler", license: "MIT", url: "https://github.com/software-mansion/react-native-gesture-handler" },
  { name: "react-native-reanimated", license: "MIT", url: "https://github.com/software-mansion/react-native-reanimated" },
  { name: "react-native-safe-area-context", license: "MIT", url: "https://github.com/th3rdwave/react-native-safe-area-context" },
  { name: "@react-native-async-storage/async-storage", license: "MIT", url: "https://github.com/react-native-async-storage/async-storage" },
];

export default function LicensesScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f5f0" }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 12 }}>
        <Pressable onPress={() => router.navigate("/(app)/settings")} hitSlop={8} style={{ padding: 8 }}>
          <ChevronLeft size={22} color="#1a1a1a" />
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: "600", color: "#1a1a1a", marginLeft: 4 }}>오픈소스 라이선스</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {LICENSES.map((lib, i) => (
          <View
            key={lib.name}
            style={{ paddingVertical: 12, borderBottomWidth: i < LICENSES.length - 1 ? 1 : 0, borderBottomColor: "#e5e5e0" }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#1a1a1a" }}>{lib.name}</Text>
            <Text style={{ fontSize: 12, color: "#999999", marginTop: 2 }}>{lib.license}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
