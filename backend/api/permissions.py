from rest_framework.permissions import BasePermission


class IsAuthenticatedCustom(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and getattr(request.user, 'is_authenticated', False))


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and getattr(request.user, 'is_admin', False))
