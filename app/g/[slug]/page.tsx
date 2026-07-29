import { GreetingExperience } from "../../BirthdayApp";

export default async function GreetingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <GreetingExperience slug={slug} />;
}
