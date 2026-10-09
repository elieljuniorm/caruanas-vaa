import React, { useContext } from "react";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import Home from "../pages/Home";
import Profile from "../pages/Profile";
import Invoices from "../pages/Invoices";
import Training from "../pages/Training";
import Classes from "../pages/Classes";
import Flat from "../pages/Flat";
import News from "../pages/News";
import Register from "../pages/Register";
import EditProfile from "../pages/EditProfile";
import RegisterClasses from "../pages/RegisterClasses";
import EditClasses from "../pages/EditClasses";
import AdminUser from "../pages/AdminUser";
import AdminInvoices from "../pages/AdminInvoices";
import InvoicesHistory from "../pages/InvoicesHistory";
import InstructorClasses from "../pages/InstructorClasses";
import AttendanceList from "../pages/AttendanceList";
import CheckInInstructor from "../pages/CheckInInstructor";
import RegisterNews from "../pages/RegisterNews";
import HealthDeclarations from "../pages/HealthDeclarations";
import Invites from "../pages/Invites";
import Privacy from "../pages/Privacy";

import { AuthContext } from "../contexts/auth";
import { useFonts } from "expo-font";

import { colors } from "../styles/colors";

// Importando os ícones da pasta assets
import homeIcon from "../../assets/icons/home.png";
import profileIcon from "../../assets/icons/person.png";
import invoicesIcon from "../../assets/icons/fatura.png";
import trainingIcon from "../../assets/icons/treino.png";
import classesIcon from "../../assets/icons/classes.png";
import flatIcon from "../../assets/icons/flat.png";
import newsIcon from "../../assets/icons/news.png";
import logoutIcon from "../../assets/icons/logout.png";
import one from "../../assets/icons/admin.png";
import two from "../../assets/icons/instrutor.png";
import three from "../../assets/icons/aluno.png";
import invitesIcon from "../../assets/icons/person-new.png"

const Drawer = createDrawerNavigator();

function CustomDrawerContent(props) {
  const { user, signOut } = useContext(AuthContext);

  const getProfileIcon = () => {
    if (!user) return profileIcon; // Retorna o ícone padrão se user for null

    // Primeiro verifica se tem profilePicture em base64
    if (user?.profilePicture) {
      // Verifica se já tem o prefixo data:image
      if (user.profilePicture.startsWith("data:image")) {
        return { uri: user.profilePicture };
      } else {
        // Assume que é base64 puro e adiciona o prefixo
        return { uri: `data:image/jpeg;base64,${user.profilePicture}` };
      }
    }

    // Se não tiver imagem, usa os ícones baseados no role
    const roleCode = user.roles?.[0]?.code;
    switch (roleCode) {
      case 1:
        return one;
      case 2:
        return two;
      case 3:
        return three;
      default:
        return profileIcon;
    }
  };

  // Função para verificar se é uma URI base64
  const isBase64Uri = () => {
    if (!user?.profilePicture) return false;

    const imageSource = getProfileIcon();
    return (
      imageSource && imageSource.uri && imageSource.uri.startsWith("data:image")
    );
  };

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={styles.drawerContent}
    >
      <TouchableOpacity
        style={styles.containerUserMain}
        onPress={() => props.navigation.navigate("Perfil")}
        accessibilityRole="button"
        accessibilityLabel={`Perfil de ${user?.name || "usuário"}`}
      >
        <View style={styles.userContainer}>
          <Image
            source={getProfileIcon()}
            style={[
              styles.userImage,
              isBase64Uri() ? styles.base64Image : styles.iconImage,
            ]}
            resizeMode={isBase64Uri() ? "cover" : "contain"}
            defaultSource={profileIcon} // Fallback
            onError={(error) => {
              console.log("Erro ao carregar imagem do drawer:", error);
            }}
          />
          <Text style={styles.userName}>Olá, {user?.name || "Usuário"}</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.drawerItemsContainer}>
        <DrawerItemList {...props} />
      </View>

      <View style={styles.footerButtonsContainer}>
        <TouchableOpacity
          style={styles.footerButton}
          onPress={() => props.navigation.navigate("Privacy")}
          accessibilityRole="button"
          accessibilityLabel="Privacidade e seus dados"
        >
          <View style={styles.footerButtonsContainerIcon}>
            <Ionicons name="shield-checkmark-outline" size={22} color={colors.icon} />
          </View>
          <Text style={styles.footerButtonText}>Privacidade</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerButton}
          onPress={() => signOut()}
          accessibilityRole="button"
          accessibilityLabel="Sair da conta"
        >
          <View style={styles.footerButtonsContainerIcon}>
            <Image source={logoutIcon} style={styles.footerButtonIcon} />
          </View>
          <Text style={styles.footerButtonText}>Sair</Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
}

export default function DrawerRoutes() {
  const [fontsLoaded] = useFonts({
    Nunito: require("../../assets/fonts/Nunito-Regular.ttf"),
  });

  const { hasRole } = useContext(AuthContext);

  if (!fontsLoaded) {
    return null;
  }

  const screens = [];

  // Inicio
  screens.push(
    <Drawer.Screen
      key="Inicio"
      name="Inicio"
      component={Home}
      options={{
        drawerIcon: ({ focused }) => (
          <Image
            source={homeIcon}
            style={{
              width: 35,
              height: 35,
              tintColor: focused ? colors.iconActive : colors.icon,
            }}
          />
        ),
        drawerLabel: ({ focused }) => (
          <Text
            style={{
              color: focused ? colors.textIconActive : colors.textIcon,
              fontSize: colors.fontItensDrawer,
              fontFamily: "Nunito",
            }}
          >
            Início
          </Text>
        ),
      }}
    />
  );

  // Perfil
  screens.push(
    <Drawer.Screen
      key="Perfil"
      name="Perfil"
      component={Profile}
      options={{
        drawerIcon: ({ focused }) => (
          <Image
            source={profileIcon}
            style={{
              width: 35,
              height: 35,
              tintColor: focused ? colors.iconActive : colors.icon,
            }}
          />
        ),
        drawerLabel: ({ focused }) => (
          <Text
            style={{
              color: focused ? colors.textIconActive : colors.textIcon,
              fontSize: colors.fontItensDrawer,
              fontFamily: "Nunito",
            }}
          >
            Perfil
          </Text>
        ),
      }}
    />
  );

  // AdminFaturas
  if (hasRole("Administrador")) {
    screens.push(
      <Drawer.Screen
        key="AdminFaturas"
        name="AdminFaturas"
        component={AdminInvoices}
        options={{
          drawerIcon: ({ focused }) => (
            <Image
              source={invoicesIcon}
              style={{
                width: 35,
                height: 35,
                tintColor: focused ? colors.iconActive : colors.icon,
              }}
            />
          ),
          drawerLabel: ({ focused }) => (
            <Text
              style={{
                color: focused ? colors.textIconActive : colors.textIcon,
                fontSize: colors.fontItensDrawer,
                fontFamily: "Nunito",
              }}
            >
              Faturas (admin)
            </Text>
          ),
        }}
      />
    );
  }

  // Faturas
  if (hasRole("Aluno")) {
    screens.push(
      <Drawer.Screen
        name="Faturas"
        component={Invoices}
        options={{
          drawerIcon: ({ focused }) => (
            <Image
              source={invoicesIcon}
              style={{
                width: 35,
                height: 35,
                tintColor: focused ? colors.iconActive : colors.icon,
              }}
            />
          ),
          drawerLabel: ({ focused }) => (
            <Text
              style={{
                color: focused ? colors.textIconActive : colors.textIcon,
                fontSize: colors.fontItensDrawer,
                fontFamily: "Nunito",
              }}
            >
              Faturas
            </Text>
          ),
        }}
      />
    );
  }

  // Convites
  if (hasRole("Aluno")) {
    screens.push(
      <Drawer.Screen
        key="Convites"
        name="Convites"
        component={Invites}
        options={{
          drawerIcon: ({ focused }) => (
            <Image
              source={invitesIcon}
              style={{
                width: 35,
                height: 35,
                tintColor: focused ? colors.iconActive : colors.icon,
              }}
            />
          ),
          drawerLabel: ({ focused }) => (
            <Text
              style={{
                color: focused ? colors.textIconActive : colors.textIcon,
                fontSize: colors.fontItensDrawer,
                fontFamily: "Nunito",
              }}
            >
              Convites
            </Text>
          ),
        }}
      />
    );
  }

  // Treino
  if (hasRole("Aluno")) {
    screens.push(
      <Drawer.Screen
        key="Treino"
        name="Treino"
        component={Training}
        options={{
          drawerIcon: ({ focused }) => (
            <Image
              source={trainingIcon}
              style={{
                width: 35,
                height: 35,
                tintColor: focused ? colors.iconActive : colors.icon,
              }}
            />
          ),
          drawerLabel: ({ focused }) => (
            <Text
              style={{
                color: focused ? colors.textIconActive : colors.textIcon,
                fontSize: colors.fontItensDrawer,
                fontFamily: "Nunito",
              }}
            >
              Treino
            </Text>
          ),
        }}
      />
    );
  }

  // Turmas
  if (hasRole("Administrador") || hasRole("Instrutor") || hasRole("Aluno")) {
    screens.push(
      <Drawer.Screen
        key="Turmas"
        name="Turmas"
        component={Classes}
        options={{
          drawerIcon: ({ focused }) => (
            <Image
              source={classesIcon}
              style={{
                width: 35,
                height: 35,
                tintColor: focused ? colors.iconActive : colors.icon,
              }}
            />
          ),
          drawerLabel: ({ focused }) => (
            <Text
              style={{
                color: focused ? colors.textIconActive : colors.textIcon,
                fontSize: colors.fontItensDrawer,
                fontFamily: "Nunito",
              }}
            >
              Turmas
            </Text>
          ),
        }}
      />
    );
  }

  // Plano
  if (hasRole("Administrador") || hasRole("Aluno")) {
    screens.push(
      <Drawer.Screen
        key="Plano"
        name="Plano"
        component={Flat}
        options={{
          drawerIcon: ({ focused }) => (
            <Image
              source={flatIcon}
              style={{
                width: 35,
                height: 35,
                tintColor: focused ? colors.iconActive : colors.icon,
              }}
            />
          ),
          drawerLabel: ({ focused }) => (
            <Text
              style={{
                color: focused ? colors.textIconActive : colors.textIcon,
                fontSize: colors.fontItensDrawer,
                fontFamily: "Nunito",
              }}
            >
              Plano
            </Text>
          ),
        }}
      />
    );
  }

  // Noticias (todos veem)
  screens.push(
    <Drawer.Screen
      key="Noticias"
      name="Noticias"
      component={News}
      options={{
        drawerIcon: ({ focused }) => (
          <Image
            source={newsIcon}
            style={{
              width: 35,
              height: 35,
              tintColor: focused ? colors.iconActive : colors.icon,
            }}
          />
        ),
        drawerLabel: ({ focused }) => (
          <Text
            style={{
              color: focused ? colors.textIconActive : colors.textIcon,
              fontSize: colors.fontItensDrawer,
              fontFamily: "Nunito",
            }}
          >
            Notícias
          </Text>
        ),
      }}
    />
  );

  // Telas ocultas (não aparecem no drawer)
  const hiddenScreens = [
    { name: "Register", component: Register },
    { name: "EditProfile", component: EditProfile },
    { name: "RegisterClasses", component: RegisterClasses },
    { name: "EditClasses", component: EditClasses },
    { name: "AdminUser", component: AdminUser },
    { name: "InvoicesHistory", component: InvoicesHistory },
    { name: "InstructorClasses", component: InstructorClasses },
    { name: "AttendanceList", component: AttendanceList },
    { name: "CheckInInstructor", component: CheckInInstructor },
    { name: "RegisterNews", component: RegisterNews },
    { name: "HealthDeclarations", component: HealthDeclarations },
    { name: "Privacy", component: Privacy },
  ];

  hiddenScreens.forEach((screen) => {
    screens.push(
      <Drawer.Screen
        key={screen.name}
        name={screen.name}
        component={screen.component}
        options={{ drawerItemStyle: { display: "none" } }}
      />
    );
  });

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerTitle: "",
        headerTintColor: colors.textWhite,
        headerStyle: {
          backgroundColor: colors.backgroundOrange,
          borderStyle: "none",
          borderBottomWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        drawerItemStyle: {
          backgroundColor: colors.backgroundOrange,
          borderRadius: 30,
          marginVertical: 5,
          paddingHorizontal: 10,
          width: "80%",
        },
        drawerLabelStyle: {
          fontSize: colors.fontItensDrawer,
        },
      }}
    >
      {screens}
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawerContent: {
    flex: 1,
    backgroundColor: colors.background,
  },
  containerUserMain: {
    display: "flex",
    alignItems: "center",
  },
  userContainer: {
    marginTop: 20,
    marginBottom: 20,
    padding: 10,
    alignItems: "center",
  },
  userImage: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  base64Image: {
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.backgroundTransparent,
  },
  userName: {
    color: colors.textWhite,
    fontSize: colors.fontUserDrawer,
    fontWeight: "bold",
    fontFamily: "Nunito",
  },
  drawerItemsContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  footerButtonsContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 30,
    height: 150,
  },
  footerButtonsContainerIcon: {
    backgroundColor: colors.backgroundTransparent,
    borderRadius: 60,
    width: 60,
    height: 60,
    padding: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  footerButton: {
    alignItems: "center",
    marginBottom: 10,
    width: 80,
    height: 80,
  },
  footerButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 40,
    marginBottom: 10,
  },
  footerButtonText: {
    color: colors.textWhite,
    fontSize: colors.fontButtonFooterDrawer,
    fontFamily: "Nunito",
  },
});
