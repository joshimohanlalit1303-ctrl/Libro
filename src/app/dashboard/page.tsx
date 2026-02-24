import Dashboard from "@/components/Dashboard/Dashboard";
import { AuthProvider } from "@/context/AuthContext";

export default function DashboardPage() {
    return (
        <AuthProvider>
            <Dashboard />
        </AuthProvider>
    );
}
