"use client";
import { useState } from "react";
import { PayPalButtons } from "./paypal-buttons";

export type BuyOption = { billing: string; label: string; price: string; note?: string };

/** Pick how long to buy, then pay. One payment, no renewal. */
export function BuyPanel({ tier, clientId, options }: { tier: "plus" | "pro"; clientId: string; options: BuyOption[] }) {
  const [billing, setBilling] = useState(options[0]!.billing);
  return (
    <div className="mt-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">How long to buy</legend>
        {options.map((o) => (
          <label key={o.billing} className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 text-sm ${billing === o.billing ? "border-foreground" : ""}`}>
            <span className="flex items-center gap-2">
              <input type="radio" name={`${tier}-billing`} checked={billing === o.billing} onChange={() => setBilling(o.billing)} />
              <span>{o.label}{o.note && <span className="block text-xs text-muted-foreground">{o.note}</span>}</span>
            </span>
            <b>{o.price}</b>
          </label>
        ))}
      </fieldset>
      <PayPalButtons key={billing} tier={tier} billing={billing} clientId={clientId} />
    </div>
  );
}
