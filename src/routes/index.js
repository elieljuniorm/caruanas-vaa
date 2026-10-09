import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Welcome from "../pages/Welcome";
import SignIn from "../pages/SignIn";
import DrawerNavigator from './DrawerNavigator';
import Register from '../pages/Register';
import EditProfile from '../pages/EditProfile';
import RegisterClasses from '../pages/RegisterClasses';
import EditClasses from '../pages/EditClasses';
import AdminUser from '../pages/AdminUser';
import InvoicesHistory from '../pages/InvoicesHistory';
import InstructorClasses from '../pages/InstructorClasses';
import AttendanceList from '../pages/AttendanceList';
import CheckInInstructor from '../pages/CheckInInstructor';
import RegisterNews from '../pages/RegisterNews';
import HealthDeclarations from '../pages/HealthDeclarations';
import Consent from '../pages/Consent';
import Privacy from '../pages/Privacy';

const Stack = createNativeStackNavigator();

export default function Routes() {
    return (
        <Stack.Navigator>

            <Stack.Screen name="Welcome" component={Welcome} options={{ headerShown: false }} />

            <Stack.Screen name="SignIn" component={SignIn} options={{ headerShown: false }} />

            <Stack.Screen name="Register" component={Register} options={{ headerShown: false }} />

            <Stack.Screen name="EditProfile" component={EditProfile} options={{ headerShown: false }} />

            <Stack.Screen name="RegisterClasses" component={RegisterClasses} options={{ headerShown: false }} />

            <Stack.Screen name="EditClasses" component={EditClasses} options={{ headerShown: false }} />

            <Stack.Screen name="AdminUser" component={AdminUser} options={{ headerShown: false }} />

            <Stack.Screen name="InvoicesHistory" component={InvoicesHistory} options={{ headerShown: false }} />

            <Stack.Screen name="InstructorClasses" component={InstructorClasses} options={{ headerShown: false }} />

            <Stack.Screen name="AttendanceList" component={AttendanceList} options={{ headerShown: false }} />

            <Stack.Screen name="CheckInInstructor" component={CheckInInstructor} options={{ headerShown: false }} />

            <Stack.Screen name="RegisterNews" component={RegisterNews} options={{ headerShown: false }} />

            <Stack.Screen name="HealthDeclarations" component={HealthDeclarations} options={{ headerShown: false }} />

            {/* Aceite bloqueante: gestureEnabled/headerShown falsos para que não
                haja como sair da tela sem aceitar ou sair da conta. */}
            <Stack.Screen
                name="Consent"
                component={Consent}
                options={{ headerShown: false, gestureEnabled: false }}
            />

            <Stack.Screen name="Privacy" component={Privacy} options={{ headerShown: false }} />

            <Stack.Screen name="Home" component={DrawerNavigator} options={{ headerShown: false }} />

        </Stack.Navigator>
    );
}
