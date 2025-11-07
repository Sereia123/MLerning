type KeyProps = {
  isActive?: boolean;
};

export default function BlackKey({ isActive }: KeyProps){
  const base = 'h-[100%] w-[40px] border border-black hover:cursor-pointer';

  const bg = isActive ? 'bg-[#6d4a4a]' : 'bg-black hover:bg-[#6d4a4a]';
  return (
    <>
      <div className={`${base} ${bg}`} />
    </>
  );
}