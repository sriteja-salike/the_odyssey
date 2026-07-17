import { NavLink } from "react-router-dom";
import { OverflowMenu, OverflowMenuItem } from "@carbon/react";
import { OverflowMenuVertical, WarningAlt, Wheat } from "@carbon/icons-react";

const SIM_NOTICE = "Simulation only — All organizations, records, quantities, costs, and outcomes in this prototype are synthetic.";

export default function ProductShell({
  active,
  children,
}: {
  active: "home" | "assistant" | "records";
  children: React.ReactNode;
}) {
  const lastRun = sessionStorage.getItem("nourishops:last-run");
  return (
    <div className="product-shell">
      <header className="product-header">
        <NavLink to="/" className="product-brand" aria-label="ShareStack home">
          <Wheat size={26} aria-hidden />
          <span>ShareStack</span>
        </NavLink>
        <nav aria-label="Primary navigation" className="product-nav">
          <NavLink to="/" end aria-current={active === "home" ? "page" : undefined}>Home</NavLink>
          <NavLink to="/assistant" aria-current={active === "assistant" ? "page" : undefined}>Ask</NavLink>
          <NavLink to="/records" aria-current={active === "records" ? "page" : undefined}>Records</NavLink>
        </nav>
        <div className="simulation-note simulation-note--home" role="note">
          <WarningAlt size={17} aria-hidden />
          <span>{SIM_NOTICE}</span>
        </div>
        <OverflowMenu aria-label="More options" renderIcon={OverflowMenuVertical} flipped>
          <OverflowMenuItem itemText="Open demo cases" href={lastRun ? `/runs/${lastRun}` : "/"} />
          <OverflowMenuItem itemText="About this simulation" />
        </OverflowMenu>
      </header>
      {children}
    </div>
  );
}
