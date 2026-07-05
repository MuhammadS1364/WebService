export default function ActiveUserCard({ Panel, UserName }) {
    return (
        <div className="relative overflow-hidden rounded-3x bg-green-100 p-8 shadow-1xl rounded-2xl m-2">

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

                        <span className="text-sm text-black-80">
                            ☀️ Good Morning
                        </span>

                        <span className="rounded-full bg-black-20 backdrop-blur-md border border-white/20 px-4 py-1 text-xs font-semibold tracking-wide">
                            {Panel}
                        </span>

                    </div>

                    <h2 className="text-4xl font-bold text-black-100">
                        Welcome back, {UserName}
                    </h2>


                    <p className="mt-3 text-1.5xl text-black-70">
                        Anjuman-e-Huda (CHS)
                    </p>
                </div>

                {/* Avatar */}
                <div className="hidden md:flex h-24 w-24 items-center justify-center rounded-full bg-white/15 backdrop-blur-xl border border-white/20 text-4xl shadow-xl">
                    👤
                </div>

            </div>
        </div>
    );
}