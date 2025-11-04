'use client';
import { useState } from "react";

export default function WhiteNote(){
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
          ${isActive ? 'bg-[#f1cccc] hover:bg-[#e7b1b1]' : 'bg-white hover:bg-[#fde8e8]'}   
          hover:cursor-pointer"
        `}
      />
    </>
  );
}