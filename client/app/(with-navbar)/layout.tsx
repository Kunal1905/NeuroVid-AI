import { ClerkProvider } from "@clerk/nextjs";
import Navbar from "../(components)/Navbar/page";

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <Navbar />
      {children}
    </ClerkProvider>
  );
}
