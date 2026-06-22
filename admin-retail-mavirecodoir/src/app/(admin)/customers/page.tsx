export default function CustomersPage() {
  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-medium tracking-[0.05em] text-[#E8EAED]">
          Customers
        </h1>
        <p className="mt-1 text-xs tracking-[0.1em] text-[#9AA0A8]">
          Customer management
        </p>
      </div>

      <div className="rounded-xl border border-[#2A303A] bg-[#1A1F26] p-6">
        <div className="flex items-center justify-center py-24">
          <p className="text-xs tracking-[0.1em] text-[#5A6068]">
            Customer directory — connecting to Medusa backend
          </p>
        </div>
      </div>
    </div>
  );
}
