import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const userOrResponse = await requireAuth(request);
  if (userOrResponse instanceof Response) {
    return userOrResponse;
  }

  try {
    const guardians = await prisma.guardian.findMany({
      where: { userId: userOrResponse.id },
      select: {
        id: true,
        address: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        addedAt: true,
        acceptedAt: true,
      },
      orderBy: { addedAt: "asc" },
    });

    return NextResponse.json({ guardians });
  } catch (error) {
    console.error("Error fetching guardians:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userOrResponse = await requireAuth(request);
  if (userOrResponse instanceof Response) {
    return userOrResponse;
  }

  try {
    const { guardians } = await request.json();

    if (!Array.isArray(guardians) || guardians.length === 0) {
      return NextResponse.json({ error: "Guardians array is required" }, { status: 400 });
    }

    if (guardians.length > 5) {
      return NextResponse.json({ error: "Maximum 5 guardians allowed" }, { status: 400 });
    }

    // Validate each guardian
    for (const guardian of guardians) {
      if (!guardian.name || typeof guardian.name !== "string") {
        return NextResponse.json({ error: "Guardian name is required" }, { status: 400 });
      }

      // At least one contact method is required
      if (!guardian.email && !guardian.phone && !guardian.address) {
        return NextResponse.json(
          { error: "At least one contact method (email, phone, or address) is required for each guardian" },
          { status: 400 },
        );
      }

      // Validate email format if provided
      if (guardian.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardian.email)) {
        return NextResponse.json({ error: `Invalid email format for guardian: ${guardian.name}` }, { status: 400 });
      }

      // Validate address format if provided
      if (guardian.address && !/^0x[a-fA-F0-9]{40}$/.test(guardian.address)) {
        return NextResponse.json(
          { error: `Invalid Ethereum address format for guardian: ${guardian.name}` },
          { status: 400 },
        );
      }

      // Validate phone format if provided
      if (guardian.phone && !/^[+]?[1-9]\d{1,14}$/.test(guardian.phone.replace(/\s|-/g, ""))) {
        return NextResponse.json({ error: `Invalid phone format for guardian: ${guardian.name}` }, { status: 400 });
      }
    }

    // Check if user already has guardians
    const existingGuardians = await prisma.guardian.count({
      where: { userId: userOrResponse.id },
    });

    if (existingGuardians > 0) {
      return NextResponse.json({ error: "User already has guardians. Use PUT to update." }, { status: 409 });
    }

    // Create guardians in transaction
    const createdGuardians = await prisma.$transaction(async (tx: any) => {
      const results = [];

      for (const guardian of guardians) {
        const created = await tx.guardian.create({
          data: {
            userId: userOrResponse.id,
            name: guardian.name,
            email: guardian.email || null,
            phone: guardian.phone || null,
            address: guardian.address?.toLowerCase() || "",
            status: "PENDING",
          },
          select: {
            id: true,
            address: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            addedAt: true,
          },
        });
        results.push(created);
      }

      return results;
    });

    // TODO: Send invitation emails/SMS to guardians
    // This would be handled by the notification service

    return NextResponse.json({
      guardians: createdGuardians,
      message: `Successfully added ${createdGuardians.length} guardians. Invitations will be sent.`,
    });
  } catch (error) {
    console.error("Error creating guardians:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
