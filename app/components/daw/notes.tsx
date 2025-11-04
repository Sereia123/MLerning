import WhiteNote from "./whitenote";
import BlackNote from "./blacknote";

type KeyboardProps = {
  keyBoardNumber: number;
};

export default function Notes(props: KeyboardProps){
  console.log(props.keyBoardNumber);
  return (
    <>
      <div className="h-full w-[10%] bg-green-500 border border-black">
        <WhiteNote />
        <BlackNote />
        <WhiteNote />
        <WhiteNote />
        <BlackNote />
        <WhiteNote />
        <BlackNote />
        <WhiteNote />
        <BlackNote />
        <WhiteNote />
        <WhiteNote />
        <BlackNote />
        <WhiteNote />
        <BlackNote />
        <WhiteNote />
        <WhiteNote />
        <BlackNote />
        <WhiteNote />
        <BlackNote />
        <WhiteNote />
      </div>
    </>
  );
}