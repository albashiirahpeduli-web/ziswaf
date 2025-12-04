import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        // 1. Verify Authentication & Role
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if user is admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
        }

        // 2. Parse Request Body
        const body = await request.json()
        const { email, password, fullName, niy, phone, role } = body

        if (!email || !password || !fullName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // 3. Create User via Admin Client
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error('SUPABASE_SERVICE_ROLE_KEY is missing')
            return NextResponse.json({ error: 'Server Configuration Error: SUPABASE_SERVICE_ROLE_KEY is missing in .env.local' }, { status: 500 })
        }
        const supabaseAdmin = createAdminClient()

        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm email
            user_metadata: { full_name: fullName }
        })

        if (createError) {
            return NextResponse.json({ error: createError.message }, { status: 400 })
        }

        if (!newUser.user) {
            return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
        }

        // 4. Create Profile
        // Note: We use upsert to handle potential race conditions if a trigger exists
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: newUser.user.id,
                email,
                full_name: fullName,
                niy,
                phone,
                role: role || 'user',
                updated_at: new Date().toISOString()
            })

        if (profileError) {
            // If profile creation fails, we might want to delete the auth user to keep state consistent
            // But for now, just return error
            return NextResponse.json({ error: 'User created but profile failed: ' + profileError.message }, { status: 500 })
        }

        return NextResponse.json({ message: 'User created successfully', user: newUser.user })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        // 1. Verify Authentication & Role
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
        }

        // 2. Parse Request
        const body = await request.json()
        const { id, email, password, fullName, niy, phone, role } = body

        if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 })

        const supabaseAdmin = createAdminClient()

        // 3. Update Auth User (Email/Password)
        const authUpdates: any = {}
        if (email) authUpdates.email = email
        if (password) authUpdates.password = password
        if (fullName) authUpdates.user_metadata = { full_name: fullName }

        if (Object.keys(authUpdates).length > 0) {
            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, authUpdates)
            if (authError) throw authError
        }

        // 4. Update Profile
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({
                full_name: fullName,
                niy,
                phone,
                role,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)

        if (profileError) throw profileError

        return NextResponse.json({ message: 'User updated successfully' })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        // 1. Verify Authentication & Role
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
        }

        // 2. Parse Request
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 })

        // Prevent deleting self
        if (id === user.id) {
            return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
        }

        const supabaseAdmin = createAdminClient()

        // 3. Delete User
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id)
        if (deleteError) throw deleteError

        return NextResponse.json({ message: 'User deleted successfully' })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
