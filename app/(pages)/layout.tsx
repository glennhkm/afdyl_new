import React from "react";

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col w-full h-full relative pt-24 sm:pt-28 md:pt-32 lg:pt-36 px-4 sm:px-6 lg:px-16 overflow-x-hidden">
      <div>{children}</div>
      <p className="text-center text-xs sm:text-sm text-gray-600 mt-8 sm:mt-12 mb-4 px-4">
        © {new Date().getFullYear()} Afdyl. All rights reserved.
      </p>
    </div>
  );
};

export default MainLayout;
