import Home from "./pages/Home";
import Reader from "./pages/Reader";
import { useReader } from "./contexts/ReaderContext";

function App() {
  const { file } = useReader();

  return (
    <>
      {
        file ?
        <Reader />
        :
        <Home />
      }
    </>
  );
}

export default App;