interface ActiveUserCardProps {
  Panel: string;
  UserName: string;
}

export default function ActiveUserCard({ Panel, UserName }: ActiveUserCardProps) {
  // Master adjustment: Dynamic greeting calculation engine based on execution time
  const getGreeting = (): string => {
    const hours = new Date().getHours();
    if (hours < 12) return "☀️ Good Morning";
    if (hours < 17) return "🌤️ Good Afternoon";
    return "🌙 Good Evening";
  };

  return (
    <div className="relative overflow-hidden bg-green-100 p-8 shadow-xl rounded-2xl m-2">

      {/* Background Glow */}
      <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-white/10 blur-3xl"></div>
      <div className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl"></div>

      {/* Grid Pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 flex items-center justify-between">

        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm font-medium text-black/80">
              {getGreeting()}
            </span>

            <span className="rounded-full bg-black/10 backdrop-blur-md border border-white/40 px-4 py-1 text-xs font-semibold tracking-wide text-gray-800">
              {Panel}
            </span>
          </div>

          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
            Welcome back,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              {UserName}
            </span>
          </h2>

          <p className="mt-3 text-xl text-gray-700 font-medium">
            Anjuman-e-Huda Niics (chs)
          </p>
        </div>

        {/* Avatar */}
        <div className="hidden md:flex h-24 w-24 items-center justify-center rounded-full bg-white/30 backdrop-blur-xl border border-white/40 text-4xl shadow-lg select-none">
          👤
        </div>

      </div>
    </div>
  );
}