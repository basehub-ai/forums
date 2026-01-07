"use client"

import { useCustomer } from "autumn-js/react"
import { Button } from "@/components/button"
import { Dialog } from "@/components/ui/dialog"
import { useDialogStore } from "@/lib/stores/dialogs"

function PaywallDialogContent() {
  const { checkout } = useCustomer()

  return (
    <div className="space-y-4">
      <p className="text-muted text-sm">
        Get more out of Forums with the Pro plan.
      </p>
      <ul className="space-y-2 text-sm">
        <li className="flex items-start justify-start gap-2">
          <span className="h-5 text-2xl text-accent">*</span>
          <span>
            <strong className="text-bright">Unlock premium models</strong>{" "}
            <span className="text-muted">
              including Claude Opus, Gemini Pro, GPT Codex and more
            </span>
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="h-5 text-2xl text-accent">*</span>
          <span>
            <strong className="text-bright">
              100 premium credits per month
            </strong>{" "}
            <span className="text-muted">for premium models</span>
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="h-5 text-2xl text-accent">*</span>
          <span>
            <strong className="text-bright">
              600 standard credits per month
            </strong>
          </span>
        </li>
      </ul>
      <div className="flex items-center justify-between pt-2">
        <span className="text-muted text-sm">$10/month</span>
        <Button
          onClick={async () => {
            await checkout({
              productId: "pro_plan",
              options: [
                {
                  featureId: "premium_credits",
                  quantity: 0,
                },
              ],
              successUrl: window.location.href,
              checkoutSessionParams: {
                cancel_url: window.location.href,
              },
            })
          }}
          size="sm"
          type="button"
        >
          Upgrade
        </Button>
      </div>
    </div>
  )
}

export function PaywallDialog() {
  const isOpen = useDialogStore((s) => s.paywallOpen)
  const setOpen = useDialogStore((s) => s.setPaywallOpen)

  return (
    <Dialog.Root onOpenChange={setOpen} open={isOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup title="Upgrade to Pro">
          <PaywallDialogContent />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
