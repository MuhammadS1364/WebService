
interface MsgBoxProps {
  isOpen: boolean;
  MsgText: string;
  MsgType?: "success" | "error" | "info";
  isLoader?: boolean;
  onClose?: () => void;
}

export default function MsgBox({
  isOpen,
  MsgText,
  MsgType = "info",
  isLoader = false,
  onClose,
}: MsgBoxProps) {
  if (!isOpen) return null;

  const typeColors: Record<string, string> = {
    success: "from-green-400 to-green-600 text-white",
    error: "from-red-400 to-red-600 text-white",
    info: "from-blue-400 to-blue-600 text-white",
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Thin transparent overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-20 backdrop-blur-sm"></div>

      {/* Message Box */}
      <div
        className={`relative p-6 rounded-xl shadow-2xl bg-gradient-to-r ${typeColors[MsgType]} w-96 text-center z-10 transform transition-all duration-300 scale-100 animate-fadeIn`}
      >
        {isLoader ? (
          <div className="flex justify-center items-center space-x-2">
            <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className="font-medium">Loading...</span>
          </div>
        ) : (
          <p className="mb-4 text-lg font-semibold">{MsgText}</p>
        )}

        <button
          onClick={onClose}
          className="mt-4 px-5 py-2 bg-white text-gray-800 rounded-lg shadow hover:bg-gray-100 transition"
        >
          OK
        </button>
      </div>
    </div>
  );
}
