import Link from "next/link";

interface NetworkItem {
  id: string;
  name: string;
  description: string;
  accent: string;
}

export default function NetworkPage() {
  const networks: NetworkItem[] = [
    {
      id: "disney-plus",
      name: "Disney+",
      description: "Originals dari Marvel, Star Wars, Pixar, dan Walt Disney Studios.",
      accent: "#0063e5"
    },
    {
      id: "netflix",
      name: "Netflix",
      description: "Serial orisinal dunia, anime eksklusif, dan film blockbuster global.",
      accent: "#e50914"
    },
    {
      id: "hbo",
      name: "HBO / Max",
      description: "Serial drama prestisius pemenang penghargaan dan dokumenter pilihan.",
      accent: "#9900ee"
    },
    {
      id: "prime-video",
      name: "Prime Video",
      description: "Koleksi tayangan aksi, thriller, dan serial orisinal Amazon Studios.",
      accent: "#00a8e1"
    },
    {
      id: "apple-tv-plus",
      name: "Apple TV+",
      description: "Serial fiksi ilmiah sinematik dengan visual dan audio kelas tinggi.",
      accent: "#666666"
    },
    {
      id: "paramount-plus",
      name: "Paramount+",
      description: "Waralaba film legendaris, aksi blockbuster, dan serial populer.",
      accent: "#0064ff"
    }
  ];

  return (
    <div className="page">
      <div className="page-heading">
        <span className="eyebrow">Jaringan Penyiaran</span>
        <h1 style={{ margin: "6px 0 4px", fontSize: "clamp(26px, 3.5vw, 42px)", fontWeight: 900 }}>Jaringan Streaming</h1>
        <p className="muted small">Eksplorasi ribuan judul film dan serial berdasarkan studio atau jaringan resmi penyedia.</p>
      </div>

      <div className="hub-grid">
        {networks.map((net) => (
          <Link key={net.id} href={`/?network=${net.id}`} className="hub-card">
            <div>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: net.accent, marginBottom: "12px" }} />
              <div className="hub-card-title">{net.name}</div>
              <p className="hub-card-sub" style={{ marginTop: "6px", lineHeight: 1.5 }}>{net.description}</p>
            </div>
            <span className="hub-card-badge">Lihat Tayangan →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
