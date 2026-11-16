import Link from "next/link";

export function StubPage({
  title,
  eyebrow,
  description,
  endpoints,
  links
}: {
  title: string;
  eyebrow?: string;
  description: string;
  endpoints?: string[];
  links?: Array<{ href: string; label: string }>;
}) {
  return (
    <div className="page narrow">
      {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
      <h1>{title}</h1>
      <p className="muted">{description}</p>
      {endpoints?.length ? (
        <>
          <h2>Observed API surface</h2>
          <ul className="code-list">
            {endpoints.map((endpoint) => (
              <li key={endpoint}>
                <code>{endpoint}</code>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {links?.length ? (
        <div className="chip-row">
          {links.map((link) => (
            <Link className="chip" key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
