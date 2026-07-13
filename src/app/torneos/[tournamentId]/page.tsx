import { Metadata } from "next"
import TournamentClient from "./tournament-client"

type Props = { params: Promise<{ tournamentId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tournamentId } = await params

  try {
    const baseUrl = process.env.NEXTAUTH_URL || "https://agendamok.cl"
    const res = await fetch(`${baseUrl}/api/public/tournaments/${tournamentId}`, { next: { revalidate: 60 } })
    if (!res.ok) return {}
    const { tournament } = await res.json()

    const title = tournament.name
    const description = tournament.description
      || `${tournament.sport ? tournament.sport + " · " : ""}Inscripciones abiertas en ${tournament.business?.name ?? "AgendaMok"}`
    const image = tournament.flyer || `${baseUrl}/og-image.png`

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [{ url: image, width: 1200, height: 630 }],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [image],
      },
    }
  } catch {
    return {}
  }
}

export default function TournamentPage({ params }: Props) {
  return <TournamentClient />
}
