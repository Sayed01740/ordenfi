# Kona

Kona is Ordenfi’s small robot assistant. Say **KOH-nah**. The name comes from *koṇa*, meaning corner, and refers to both its cut shell and its place beside the workspace.

Kona is alert, patient and a little playful. A hand flick welcomes someone into the chat. A glance points them to a field. Warning expressions stay composed so the next step is easy to see. Use **Kona** as the character name and **Ordenfi assistant** when the role needs explaining.

## Shape and palette

The cut graphite shell, short angled antenna, two lime eyes and split chest mark are the features that identify Kona at a glance. Show it at 52 px or larger in the UI. Leave enough clear space for the hand gestures and receipt to extend past the shell.

| Color | Value | Use |
|---|---|---|
| Graphite | `#353C3A` | Shell |
| Visor | `#101614` | Faceplate |
| Lime | `#B9FA0A` | Idle, guidance and replies |
| Amber | `#E9BD75` | Network mismatch or expired quote |
| Blue | `#97B8D6` | Waiting for transaction confirmation |
| Rose | `#EE9B98` | Needs attention |

## Motion and product behavior

- **Idle, look around, wake and dock.** The idle loop plays once. The eyes respond to the pointer. Opening chat lifts the head and flicks a hand. Minimizing settles the body back into the launcher.
- **Guide, think, reply and unread reply.** A hand points toward the active form. The visor scans while an answer is being prepared. A smile and nod acknowledge a reply. The antenna flashes once for an unread reply.
- **Network mismatch, expired quote, pending confirmation and needs attention.** Color and pose reflect the state in the workspace. Pair each pose with text so the meaning is clear at a glance or with a screen reader.
- **QR courier and receipt ready.** The hand presents the local QR card. A receipt appears once the selected live transaction has a confirmed receipt. The workspace’s receipt panel carries the hash and explorer link.

The live component honors the browser’s Reduce Motion preference. Static poses and status text convey the same states. The offline preview can replay each motion separately. The WebP clips are looping exports for presentations or reference.
