import Header from "@/components/Header";
import Hero from "@/components/Hero";
import ContributorTicker from "@/components/ContributorTicker";
import About from "@/components/About";
import Capabilities from "@/components/Capabilities";
import Method from "@/components/Method";
import Labs from "@/components/Labs";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import Rails from "@/components/Rails";

export default function Home() {
  return (
    <main className="min-h-screen bg-background relative">
      <Rails />
      <Header />
      <Hero />
      <ContributorTicker />
      <About />
      <Capabilities />
      <Method />
      <Labs />
      <Contact />
      <Footer />
    </main>
  );
}
