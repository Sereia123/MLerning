import Header from './components/header';
import Question from './components/question';
// import SubPage from './subpage';
// import DawBase from './components/daw/dawbase';
import Scale from './components/scale/scale';
// import RhythmBase from './components/rhythm/rhythm';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-900">
      <Header />
      <Question />
      {/* <SubPage /> */}
      {/* <RhythmBase /> */}
      <Scale />
      {/* <DawBase /> */}
    </main>
  );
}