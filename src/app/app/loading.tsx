import { Container } from "@/components/ui/container";

export default function Loading() {
  return (
    <Container width="narrow" className="py-10" aria-busy="true">
      <p className="sr-only" role="status">
        Loading…
      </p>
      <div aria-hidden className="space-y-4">
        <div className="bg-sunken h-8 w-2/3 animate-pulse rounded-md" />
        <div className="bg-sunken h-4 w-full animate-pulse rounded-md" />
        <div className="bg-sunken h-4 w-5/6 animate-pulse rounded-md" />
        <div className="bg-sunken mt-8 h-40 w-full animate-pulse rounded-lg" />
      </div>
    </Container>
  );
}
