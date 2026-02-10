import { prisma } from '@/lib/prisma'
import { ChatMessageType } from '@prisma/client'

/**
 * Post a system message to the case chat (e.g. on stage change).
 * Call this from APIs that change case stage or trigger notable events.
 */
export async function postCaseChatSystemMessage(leadId: string, content: string): Promise<void> {
  await prisma.caseChatMessage.create({
    data: {
      leadId,
      type: ChatMessageType.SYSTEM,
      content,
    },
  })
}
