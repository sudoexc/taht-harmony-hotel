from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError


class AuthUser:
    """Lightweight user object attached to request after JWT auth."""
    def __init__(self, payload):
        self.id = payload.get('sub')
        self.email = payload.get('email', '')
        self.hotel_id = payload.get('hotel_id')
        self.role = payload.get('role', 'MANAGER')
        self.is_authenticated = True

    @property
    def is_admin(self):
        return self.role == 'ADMIN'


class CookieJWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        token = request.COOKIES.get('accessToken')
        if not token:
            return None
        try:
            validated = AccessToken(token)
            payload = validated.payload
            user = AuthUser(payload)
            if not user.id or not user.hotel_id:
                raise AuthenticationFailed('Invalid token payload')
        except TokenError as e:
            raise AuthenticationFailed(str(e))

        from .models import User
        current_version = (
            User.objects.filter(id=user.id)
            .values_list('token_version', flat=True)
            .first()
        )
        if current_version is None:
            raise AuthenticationFailed('User no longer exists')
        if current_version != payload.get('tv', 0):
            raise AuthenticationFailed('Token has been revoked')
        return (user, token)
