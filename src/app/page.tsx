import { Rails, Header, Footer } from "@/components/layout";
import {
  Hero,
  ContributorTicker,
  About,
  Capabilities,
  Method,
  Labs,
  Contact,
} from "@/components/home";

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
