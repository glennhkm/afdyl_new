"use client";

import { useRouter } from "next/navigation";
import Icon from "../Icon";

interface TopbarProps {
  title: string;
  actionButton?: React.ReactNode;
  showBackButton?: boolean;
  textColor?: string;
  isTransparentBg?: boolean;
  onBackClick?: () => void;
}

const Topbar = ({
  title,
  actionButton,
  showBackButton = true,
  isTransparentBg = false,
  textColor = "text-black",
  onBackClick,
}: TopbarProps) => {
  const router = useRouter();

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      router.back();
    }
  };

  return (
    <div className={`w-screen fixed inset-0 h-20 sm:h-24 md:h-28 lg:h-32 ${isTransparentBg ? 'bg-transparent' : 'bg-background'} flex items-center justify-between px-4 sm:px-6 lg:px-16 z-100`}>
      {showBackButton ? (
        <button
          onClick={handleBackClick}
          className="p-1.5 sm:p-2 lg:p-3 flex items-center justify-center rounded-full bg-brown-brand cursor-pointer hover:opacity-90 duration-200 shadow-lg"
        >
          <Icon
            name="RiArrowLeftLine"
            color="white"
            className="w-5 sm:w-6 lg:w-8 h-5 sm:h-6 lg:h-8"
          />
        </button>
      ) : (
        <div className="w-8 sm:w-10 lg:w-14" /> // Placeholder for layout balance
      )}
      <h1 className={`${textColor} font-bold text-lg sm:text-xl md:text-2xl lg:text-4xl absolute left-1/2 transform -translate-x-1/2 max-w-[60%] sm:max-w-none truncate text-center`}>
        {title}
      </h1>
      {actionButton || <div className="w-8 sm:w-10 lg:w-14" />}
    </div>
  );
};

export default Topbar;
