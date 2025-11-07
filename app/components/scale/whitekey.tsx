type KeyProps = {
  isActive?: boolean;
};

export default function WhiteKey({ isActive }: KeyProps){
  const base = 'h-full w-[60px] border border-black pointer-events-none';

  const bg = isActive ? 'bg-[#f1cccc]' : 'bg-white';
  return (
    <>
      <div className={`${base} ${bg}`} />
    </>
  );
}