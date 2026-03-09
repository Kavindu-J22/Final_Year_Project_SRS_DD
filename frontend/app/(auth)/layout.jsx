/** Auth route group layout – no sidebar, full-screen gradient background */
export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}

