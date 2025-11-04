'use client';
import { useState } from "react";

export default function BlackNote(){
  const [isActive, setIsActive] = useState(false);

  const handleClick = () => {
    setIsActive((prev) => !prev);  
  };
  return (
    <>
      <div 
        onClick={handleClick}
        className={`
          h-[5%] w-full border border-black
          ${isActive ? 'bg-[#b47a7a] hover:bg-[#aa5151]' : 'bg-gray-300 hover:bg-[#cebdbd]'}   
          cursor-pointer
        `}
      />
    </>
  );
}