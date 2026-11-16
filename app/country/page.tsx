import Link from "next/link";
import { slugify, uniqueCountries } from "@/lib/data";

const countryNames: Record<string, string> = {
  KR: "Korea Selatan",
  JP: "Jepang",
  US: "Amerika Serikat",
  CN: "Tiongkok",
  TH: "Thailand",
  GB: "Inggris Raya",
  FR: "Prancis",
  DE: "Jerman",
  ES: "Spanyol",
  IT: "Italia",
  DK: "Denmark",
  MY: "Malaysia"
};

export default function CountryIndexPage() {
  const countries = uniqueCountries();

  return (
    <div className="page">
      <div className="page-heading">
        <span className="eyebrow">Asal Produksi</span>
        <h1 style={{ margin: "6px 0 4px", fontSize: "clamp(26px, 3.5vw, 42px)", fontWeight: 900 }}>Negara Asal</h1>
        <p className="muted small">Pilih tayangan berdasarkan negara tempat produksi film atau serial.</p>
      </div>

      <div className="hub-grid">
        {countries.map((code) => {
          const name = countryNames[code] || code;
          return (
            <Link key={code} href={`/country/${slugify(code)}`} className="hub-card">
              <div>
                <span className="hub-card-sub">{code}</span>
                <div className="hub-card-title" style={{ marginTop: "4px" }}>{name}</div>
              </div>
              <span className="hub-card-badge">Lihat Film & Serial →</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
