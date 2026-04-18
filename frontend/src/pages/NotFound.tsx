import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container-editorial flex flex-col items-center justify-center py-32 text-center">
        <div className="eyebrow">Error 404</div>
        <h1 className="font-serif-display mt-4 text-7xl font-medium leading-none">Off the page.</h1>
        <p className="mt-4 max-w-md text-muted-foreground">
          This URL didn't make it past the editor. Let's get you back to a story we can read.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm text-background hover:bg-foreground/85"
        >
          Return to the front page
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
};

export default NotFound;
