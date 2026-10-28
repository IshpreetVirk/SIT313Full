import { Header, Banner, Profile, Portfolio, Gallery, Footer } from "./components/Sections";
import Articles from "./components/Articles";
import Tutorials from "./components/Tutorials";

function App() {
  return (
    <div className="app">
      <Header />
      <Banner />
      <Profile />
      <Portfolio />
      <Gallery />
      <Articles />
      <Tutorials />
      <Footer />
    </div>
  );
}

export default App;