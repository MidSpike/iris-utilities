//------------------------------------------------------------//
//                   Copyright (c) MidSpike                   //
//------------------------------------------------------------//

use crate::Context;

//------------------------------------------------------------//

pub fn is_entitlement_checking_enabled() -> bool {
    std::env::var("ENTITLEMENT_CHECKING_ENABLED")
    .unwrap_or("invalid".into())
    .parse::<bool>()
    .unwrap_or(false)
}

//------------------------------------------------------------//

/// For now we will just check if the user has any entitlements
/// that are not deleted, from this application, and are currently valid.
///
/// In the future, specific entitlements should be checked.
/// But for now, since Discord only allows one active entitlement per application,
/// we can just check if they have any entitlements at all.
///
/// When entitlement checking is disabled, all users are considered to have entitlements.
pub fn has_entitlement(
    ctx: &Context<'_>,
) -> bool {
    let entitlement_checking_enabled = is_entitlement_checking_enabled();

    if !entitlement_checking_enabled {
        return true;
    }

    let entitlement =
        &ctx.interaction.entitlements
        .iter()
        .find(
            |context_entitlement| {
                context_entitlement.deleted == false &&
                context_entitlement.application_id == ctx.interaction.application_id
            }
        );

    let Some(entitlement) = entitlement else {
        return false;
    };

    let now_seconds = chrono::Utc::now().timestamp();

    if let Some(starts_at) = entitlement.starts_at {
        let starts_at_seconds = starts_at.unix_timestamp();

        if now_seconds < starts_at_seconds {
            println!("Entitlement: {:?} is not yet valid.", entitlement);

            return false;
        }
    }

    if let Some(ends_at) = entitlement.ends_at {
        let ends_at_seconds = ends_at.unix_timestamp();

        if now_seconds > ends_at_seconds {
            println!("Entitlement: {:?} is no longer valid.", entitlement);

            return false;
        }
    }

    true
}
