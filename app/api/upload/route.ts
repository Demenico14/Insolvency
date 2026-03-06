import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type (PDF, images, documents)
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PDF, images, Word, Excel" },
        { status: 400 }
      )
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB" },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const filePath = `documents/${timestamp}-${sanitizedName}`

    // Convert File to ArrayBuffer for Supabase
    const arrayBuffer = await file.arrayBuffer()

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("insolvency-files")
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error("Supabase storage error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("insolvency-files")
      .getPublicUrl(data.path)

    return NextResponse.json({ 
      url: urlData.publicUrl,
      pathname: data.path,
      filename: file.name,
      size: file.size,
      type: file.type
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { pathname } = await request.json()

    if (!pathname) {
      return NextResponse.json({ error: "No pathname provided" }, { status: 400 })
    }

    const { error } = await supabase.storage
      .from("insolvency-files")
      .remove([pathname])

    if (error) {
      console.error("Supabase delete error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete error:", error)
    return NextResponse.json({ error: "Delete failed" }, { status: 500 })
  }
}
