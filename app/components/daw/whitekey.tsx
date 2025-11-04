type KeyProps = {
  isActive?: boolean;
};

export default function WhiteKey({ isActive }: KeyProps){
  const base = "h-10 w-full border border-black hover:cursor-pointer";
  const bg = isActive ? 'bg-[#f1cccc] hover:bg-[#e7b1b1]' : 'bg-white hover:bg-[#f0cccc]';
  return (
    <>
      <div className={`${base} ${bg}`} />
    </>
  );
}