import { PharmacyInventory } from "@/components/pharmacy-inventory";

export default function Pharmacy() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Farmácia</h1>
        <p className="text-muted-foreground mt-1">Controle de estoque e dispensação de medicamentos</p>
      </div>

      <PharmacyInventory />
    </div>
  );
}
