using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Gagebu_Server.Auth
{
    // 가계부가 정해진 요청만 통과 (로그인했거나, 개발용 익명 모드)
    public class RequireHouseholdAttribute : Attribute, IAsyncActionFilter
    {
        public Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var current = context.HttpContext.RequestServices.GetRequiredService<CurrentUser>();
            if (current.HouseholdId is null)
            {
                context.Result = new UnauthorizedResult();
                return Task.CompletedTask;
            }
            return next();
        }
    }

    // 로그인한 사용자만 통과 (익명 모드 불가)
    public class RequireUserAttribute : Attribute, IAsyncActionFilter
    {
        public Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var current = context.HttpContext.RequestServices.GetRequiredService<CurrentUser>();
            if (current.UserId is null)
            {
                context.Result = new UnauthorizedResult();
                return Task.CompletedTask;
            }
            return next();
        }
    }
}
